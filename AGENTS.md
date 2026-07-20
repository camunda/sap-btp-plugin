# AGENTS.md

Architecture reference for the Camunda BTP Plugin. For dev workflows and setup commands, see `README.md`.

## Purpose

Integrates Camunda 8 with SAP BTP: it lets an SAP Fiori/UI5 app start Camunda process instances, receive user task forms in real time, and complete them — with SAP XSUAA identity for auth and SAP HANA Cloud/PostgreSQL for persistence.

## Monorepo layout

npm workspaces, defined in root `package.json`:

| Workspace | Package | Role |
|---|---|---|
| `core` | `@camunda8/btp-plugin-core` | CAP (SAP Cloud Application Programming Model) backend. Talks to Zeebe/Camunda 8, exposes OData/REST services, persists state. |
| `fiori-app` | `@camunda8/fiori-app` | UI5/TypeScript Fiori frontend. Renders forms, drives the process lifecycle UI. |
| `user-task-fiori` | `@camunda8/user-task-fiori` | UI5 component library (`BPMNForm`) that renders a Camunda form-schema JSON in Fiori design. Consumed by `fiori-app`. |
| `router` | uses `@sap/approuter` | SAP Approuter: single entry point, auth gateway, reverse proxy to backend + UI. |
| `websocket` | `@camunda8/websocket` | CDS plugin adding a WebSocket server (`ws`) to the CAP backend for pushing forms to the UI. |

Other top-level dirs: `test/` (docker-compose stacks per Camunda version 8.7–8.10, `.env-localdev`, E2E fixtures), `examples/` (sample BPMN + forms), `_misc/` (`setup-local.sh`, `deployForms.sh`, patches), `.github/workflows/` (CI, E2E matrix, BTP deploy).

## Local ports

| Service | Port | Note |
|---|---|---|
| Approuter (prod) / dev-approuter (local) | 5001 | Entry point: `http://localhost:5001/app/index.html`. 5001 not 5000, to dodge a macOS port clash (AirPlay Receiver on 5000). |
| CAP backend (`core`) | 4004 | OData (`/odata/v4/bpmn`, `/odata/v4/inbound`), REST (`/inbound`), WebSocket (`/channel/*`). |
| UI5 frontend (`fiori-app`) | 8095 | Hot-reload dev server. |
| Standalone PostgreSQL (local dev) | 5433 | Not the default 5432. |
| Adminer (PG UI) | 8888 | |
| Zeebe gRPC (local docker-compose) | 26500 | |

## Request flow

1. **Start process** — UI opens a WebSocket to `/channel/{channelId}` (a client-generated id), then calls action `runProcess` on the `BPMN` service (`core/srv/bpmn.cds`, `core/srv/bpmn.js`). The backend calls Zeebe's `createProcessInstance`, and records the `channelId` ↔ process instance in the `BrowserClients` table (`core/db/clients.cds`).
2. **Form delivery** — When Zeebe activates a user-task job, a job worker (`core/srv/lib/userTaskWorker.js`) reads `channelId` from job variables, loads the form, persists it to `UserTasks` (`core/db/user-tasks.cds`), and pushes it over the WebSocket plugin to the matching `channelId`. The UI receives it via `fiori-app/webapp/util/WebSocket.ts` and renders it with the `BPMNForm` component from `user-task-fiori`.
3. **Complete task** — UI calls action `completeUsertask` (jobKey for classic jobs, userTaskKey for Camunda ≥8.8 orchestration API) with the form data; the backend completes the job/task in Zeebe and deletes the `UserTasks` row.
4. **Cleanup** — UI calls `deleteChannel` to remove the `BrowserClients` row when the process ends or the client disconnects.

There's also an inbound path: `Inbound` service (`core/srv/inbound.cds`, `/odata/v4/inbound` and REST `/inbound`) lets external systems POST to start a process instance (optionally waiting for the result via `wait: true`).

## Camunda 8 integration (`core/srv/lib/camunda.js`)

Singleton wrapping `@camunda8/sdk`'s `Camunda8` client, lazily `init()`'d once CDS has served (`core/srv/server.js`, skipped if `DISABLE_CAMUNDA` is set). On the Zeebe gRPC client's `onReady`, it registers workers:
- `io.camunda.zeebe:userTask` — classic job worker, all Camunda versions.
- If the connected gateway is >8.8, also registers three **task listener** workers via the orchestration-cluster-api client (`sap-tl-creating`, `sap-tl-completing-success`, `sap-tl-completing-fail`) for the newer Camunda User Task type.

Both worker kinds are handled by the same `userTaskWorker.js` handler. This dual-path lets the plugin support both legacy job-based user tasks and the Camunda ≥8.8 orchestration-based user tasks without version branching in the service layer.

## Router (`router/`)

Three interchangeable `xs-app*.json` routing configs, all proxying `/backend/*` → `srv_api` destination (CAP backend), `/channel/*` → `srv_api` (WebSocket upgrade), `/app/*` → `ui` destination (`fiori-app`):

| Config | Auth | Used for |
|---|---|---|
| `xs-app.json` | xsuaa | BTP deployment |
| `xs-app-hybrid.json` | xsuaa | Local runtime + real BTP XSUAA login (`cds bind`) |
| `xs-dev.json` | none | Fully local/offline dev |

Destinations (`srv_api`, `ui`) are resolved from BTP destination service in the cloud, or from `router/default-env.json` (gitignored) for local/hybrid dev, pointing at `localhost:4004` and `localhost:8095`.

## Data model (`core/db/*.cds`)

- `BrowserClients` — active `channelId` ↔ process instance associations per authenticated user.
- `UserTasks` — pending task's `jobKey`/`userTaskKey`, form JSON, and process variables, scoped to the claiming user; the `BPMN.UserTasks` projection filters by `$user`.

Persistence is SQLite for local dev, PostgreSQL in BTP (via `@cap-js/postgres`, deployed as its own MTA task using `core/pg-options.json`).

## BTP deployment (`mta.yaml.example`)

Cloud Foundry MTA with four modules: `btp-plugin-router` (approuter), `btp-plugin-srv` (CAP backend, built from `core/gen/srv`), `camunda-btp-plugin-postgres-deployer` (schema migration task), `btp-plugin-ui` (`fiori-app` as an html5 app). Backed by managed services: `xsuaa` (identity), `destination` + `connectivity` (routing/on-prem), `postgresql-db` (persistence). Zeebe/Camunda cloud cluster credentials (`ZEEBE_*`, `CAMUNDA_*`) are injected as properties on `btp-plugin-srv`.

## Auth

- Local dev (`xs-dev.json`): no auth.
- Hybrid/BTP: XSUAA-issued JWT, forwarded by the approuter to the CAP backend (`forwardAuthToken: true`); CDS services are annotated `@(requires: 'authenticated-user')` and data projections filter by `$user`.
