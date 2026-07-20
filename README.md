# Camunda BTP Plugin

## Architecture (dev time)

At dev time, three services run side by side and talk to each other through the (dev-)approuter:

```
Browser
   │  http://localhost:5001/app/index.html
   ▼
dev-approuter (:5001)              <- entry point, routes by path prefix
   ├── /app/*      ─────────────▶  fiori-app UI5 dev server (:8095)
   ├── /backend/*  ─────────────▶  core CAP backend (:4004)   [OData/REST]
   └── /channel/*  ─────────────▶  core CAP backend (:4004)   [WebSocket]
                                          │
                                          ▼
                                    Camunda 8 (Zeebe/Tasklist)
```

- **dev-approuter (`:5001`)** is the single entry point the browser talks to. It doesn't implement any business logic itself — it just proxies requests based on path prefix (see `router/xs-dev.json` / `xs-app-hybrid.json` / `xs-app.json`) and, in local mode, also starts the CAP backend for you. This is why the UI is always opened via `localhost:5001/app/...` and never directly via `:8095` or `:4004`.
- **fiori-app UI5 dev server (`:8095`)** serves the actual Fiori/UI5 frontend (views, controllers, the `BPMNForm` component from `user-task-fiori`) with hot reload. It only renders UI and talks to the backend exclusively through `/backend/*` and `/channel/*` — it has no direct knowledge of Camunda.
- **core CAP backend (`:4004`)** is the only service that talks to Camunda 8 directly (via the Zeebe gRPC/REST client, see `core/srv/lib/camunda.js`). It exposes the `BPMN` and `Inbound` OData/REST services and hosts a WebSocket server (`websocket` plugin) for pushing forms to the browser.

### Request flow: starting a process and filling in a user task

1. The browser opens `http://localhost:5001/app/index.html`. The dev-approuter forwards this to the UI5 dev server on `:8095`, which renders the app.
2. The UI generates a unique `channelId` and opens a WebSocket to `/channel/{channelId}`. The approuter forwards this (still on `:5001`) to the CAP backend on `:4004`, which accepts it via the `websocket` plugin.
3. The user clicks "start process". The UI calls the `BPMN.runProcess` action via `POST /backend/odata/v4/bpmn/runProcess` (routed by the approuter to `:4004`), passing `bpmnProcessId`, the `channelId`, and any input `variables`.
4. CAP (`core/srv/bpmn.js`) stores the `channelId` ↔ process-instance link in the `BrowserClients` table and calls Zeebe's `createProcessInstance` to actually start the process in Camunda 8.
5. Camunda runs the process until it reaches a user task. Depending on the Camunda version, one of two mechanisms picks up the resulting work — both are handled by the same `core/srv/lib/userTaskWorker.js` handler:
   - **classic job worker** (`io.camunda.zeebe:userTask`) — available on every Camunda version.
   - **task listeners** (`sap-tl-creating`, `sap-tl-completing-success`, `sap-tl-completing-fail`) — registered additionally via the orchestration-cluster-api client when the connected Camunda gateway is ≥8.8, for the newer Camunda User Task type.

   Either way, the worker loads the task's form and persists it to the `UserTasks` table.
6. The worker pushes the form to the browser over the WebSocket connection identified by `channelId` (routed the whole way back through `:5001` → `:4004` → the open socket). The UI receives it and renders it with the `BPMNForm` component.
7. The user fills in the form and submits. The UI calls `BPMN.completeUsertask` via `POST /backend/odata/v4/bpmn/completeUsertask` (again through the approuter to `:4004`) with the filled-in variables, plus either a `jobKey` (classic job worker) or a `userTaskKey` (task listener / orchestration API), depending on which mechanism delivered the task.
8. CAP completes the job (via Zeebe) or the user task (via the orchestration API) accordingly, and deletes the corresponding `UserTasks` row. If the process reaches another user task, steps 5–7 repeat on the same `channelId`; once the process ends, the UI shows a summary and calls `BPMN.deleteChannel` to clean up the `BrowserClients` entry.

## dev time


```json
{
  "PORT": 5001,
  "//destinations": "this is for dev time only!",
  "destinations": [
    {
      "name": "@camunda8/btp-integration-core",
      "url": "http://localhost:4004",
      "forwardAuthToken": true
    },
    {
      "name": "ui",
      "url": "http://localhost:8095",
      "forwardAuthToken": true
    }
  ]
}
```

- build of both UI and backend are at deploy-time only  
- dev-time uses either
  - hot reload (UI) and `cds` tooling for serving the modules  
  - app router (for hybrid scenario)
- deployment uses app router for both

### local setup

...w/o authN and authZ

```shell
# in / of the proj
# credentials for local c8
$> source test/.env-localdev

# boot your prefered camunda version, e.g. 8.9
$> cd fiori-app/webapp/config/8.9; docker-compose up

# boot up a the postgresql server
$> cd test/docker/pgstandalone; docker-compose up

# prepare local development with local postgres server and disabled auth strategy
$> sh _misc/setup-local.sh

# start the btp plugin... docker ports differ a bit from JAVA Node Camunda version, therefor override tasklist base url
$> CAMUNDA_TASKLIST_BASE_URL=http://localhost:8080 npm run start:local

# -> http://localhost:5001/app/index.html is now Entry-Point of UI
```

- the dev-approuter is used in place of the approuter  
  it in turn starts the CAP backend

### hybrid setup

...so that most importantly `authN` and `authZ` work against the BTP `xsuaa`!

create necessary `xsuaa` service instance:

```shell
# in / of the proj
$> cf login ...

# optional if uaa instance has already been created
$> cf cs xsuaa application uaa-hybrid-instance -c xs-security.json

$> cds bind -2 uaa-hybrid-instance # auto-creates a service key
# ... creates .cdsrc-private.json

# credentials for local c8
$> source test/.env-localdev

# boot up a c8 version locally from /test/docker
$> cd test/docker/...; docker-compose up

# boot up standalone postgres as persistence
# this is mapped on port 5433 (!)
# and has an adminer instance on http://localhost:8888
$> cd test/docker/pg-standalone; docker-compose up

# make sure your database credentials are set up correctly in _misc/cdsrc-private.json
# set up database credentials also in env variables if they differ from default values:
# DB_USER="postgres"
# DB_PASS="postgres"
# DB_HOST="localhost"
# DB_PORT="5433"
# DB_NAME="sap-btp-plugin"

# fiddle up files for local runtime
./_misc/setup-local.sh --hybrid

# runtime local, auth(n,z) from BTP
# this will also 
# - cp /router/xs-app.json /router/xs-app.json.orig
# - cp /router/xs-app-hybrid.json /router/xs-app.json
$> cds bind --exec -- npm run start:hybrid

# -> http://localhost:5001
```

check working binding with `cds env list requires.auth --resolve-bindings --profile hybrid`

### only backend

terminal 1: 

- `cf login ...`
- `PORT=5001 cds bind --exec -- npm start -w router`

terminal 2:

- `cd core`
- `source ../test/.env-localdev`
- `cds w --profile hybrid`

### common settings

- dev-approuter: port 5001 (not 5000, b/c of macOS port issue)
- approuter locally: port 5001 (see above)
- UI5 frontend: port 8095
- CAP backend: port 4004

- standalone PostgreSQL: 5433
- standalone Adminer for PostgreSQL: http://localhost:8888

- `process.env.DISABLE_CAMUNDA` turns off C8 connectivity
- `DEBUG=camunda` or `cds.debug("camunda")` will trigger debug log output

- `test/.env-localdev` holds the connection info to C8 local cluster for flight-mode-dev &rarr; `source test/.env-localdev`

### local C8 SM

- from https://github.com/camunda/camunda-distributions/tree/main/docker-compose
- in folder `test/docker`, all local dev resources are located


### router

- make sure that an env var `destinations` is present and hold `srv_api` and `ui` pointing to the "backend" (`core`) and "UI" (`fiori-app`) respectively

## Testing

### Unit tests (`core`)

The CAP backend has Jest unit tests in `core/test/` (e.g. `inbound-mocked-c8.test.js`, `inbound-wait-c8.test.js`, `inbound-errors-mocked-c8.test.js`, `persistUserTask.test.js`), backed by CSV fixtures in `core/test/data/`. They cover the `Inbound` service handler (starting processes, `wait`-behavior, error cases) and user task persistence, with the real Camunda client mocked out — no running Camunda 8 or router/UI is needed.

```shell
cd core
npm test
```

In CI, `DISABLE_CAMUNDA=true` is additionally set so `core/srv/server.js` skips `camunda.init()` entirely (see `process.env.DISABLE_CAMUNDA` above).

### E2E tests (`fiori-app`)

There are two E2E suites, covering the same UI from different angles:

- **Playwright** (`fiori-app/webapp/test/playwrightE2E/`) — the primary suite, driven against the full stack through the (dev-)approuter at `http://localhost:5001/app/index.html`. Specs live under `controls/` (one BPMN process + form per UI5 form-control type: checkbox, input, select, datetime, radio group, textarea, text) and `misc/` (basic process start/completion flows). Requires a running Camunda 8 instance, since it exercises the real request flow described above (start process → receive form via WebSocket → submit → complete task).
- **WebdriverIO/wdi5** (`fiori-app/webapp/test/e2e/`) — an older, UI5-focused suite that talks directly to the UI5 dev server's mock server (`http://localhost:8095/mockserver.html?channelId=...`), without a real backend/Camunda. Still run in CI (`reusable_test.yml`) as a fast, backend-independent check of form-control rendering and validation.

#### Codegen

Using the codegenerator for creating new Playwright tests run `npm run e2e:codegen`. A chromium instance starts, where you can use the ui and in background your click path is collected in form of playwright testcode.

#### Run tests

```shell
# Playwright, against a running Camunda instance + full local/hybrid stack (see "local setup" above)
$> npm run e2e:test

# deploy the example BPMN processes/forms used by the Playwright specs beforehand
$> npm run e2e:test:deployForms

# wdi5, against the UI5 mock server only (no Camunda/CAP needed)
$> cd fiori-app; npm run test:e2e
```

`e2e:test:deployForms` wraps `_misc/deployForms.sh`, which deploys every `.bpmn`/`.form` file found in `fiori-app/webapp/test/playwrightE2E/controls/camunda` and `.../misc/camunda` to the running Camunda instance. It doesn't fail the deployment on a single bad file, since not every form feature is supported by every Camunda version.

### Multi-version Camunda matrix

The Playwright suite is run against every supported Camunda 8 version (8.7–8.10), each with its own docker-compose stack under `fiori-app/webapp/config/<version>/`. 8.7 runs Zeebe/Tasklist/Operate as separate containers; 8.8+ run the all-in-one `camunda` container. Where a version supports both Tasklist v1 and v2, the CI workflow runs the full Playwright suite once per mode, toggled via `CAMUNDA_TASKLIST_V2_MODE_ENABLED`.

### CI workflows (`.github/workflows/`)

- **`test.yml`** — runs on every PR to `main`; calls `reusable_test.yml` for Node 22 and 23.
- **`reusable_test.yml`** — installs deps, runs the `core` unit tests (`DISABLE_CAMUNDA=true npm test`), then the `fiori-app` wdi5 E2E suite (`npm run test:e2e`), uploading screenshots as artifacts.
- **`webapp-e2e-tests-on-demand.yml`** — the full Playwright matrix; runs on PRs and via manual `workflow_dispatch` (pick a single Camunda version). For each version/Tasklist-mode combination it boots Camunda + a standalone Postgres, waits for readiness, deploys the example forms, runs `npm run e2e:test`, and uploads HTML reports/logs as artifacts.
- **`reusable_deploy-to-btp.yml`** — Cloud Foundry deployment to BTP (see `mta.yaml.example`).

Run the on-demand workflow locally with [`act`](https://github.com/nektos/act) via `npm run gh:test` (defaults to Camunda 8.7).

### Lint & type-check

```shell
cd fiori-app
npm run lint          # eslint over webapp/
npm run ts-typecheck  # tsc --noEmit
```