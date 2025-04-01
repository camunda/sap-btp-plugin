# UI5 Library io.camunda.connector.sap.btp.lib

This lib implements rendering Camunda forms in the SAP Fiori design.

## build + dev

note: the production dependency to `feelers` is noted here, but resolved in the consuming app

- dev time: by serving the module from `node_modules` via `ui5-tooling-modules`
- build time:
  - bundling is resolved by also declaring the production dependency in the app
  - AND by using it in the code-base (see `Component.ts`)
