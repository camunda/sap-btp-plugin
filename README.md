# Camunda BTP Plugin

## dev time

- `process.env.DISABLE_CAMUNDA` turns off C8 connectivity
- `DEBUG=camunda` or `cds.debug("camunda")` will trigger debug log output

## router

- make sure that an env var `destinations` is present and hold `srv_api` and `ui` pointing to the "backend" (`core`) and "UI" (`fiori-app`) respectively
