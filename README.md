# Camunda BTP Integration


## dev time

- `process.env.DISABLE_CAMUNDA` turns off C8 connectivity
- `DEBUG=camunda` or `cds.debug("camunda")` will trigger debug log output

- `test/.env-localdev` holds the connection info for flight-mode-dev &rarr; `source test/.env-localdev`

### local C8 SM

in folder `test/docker`, all local dev resources are located

- 8.6: `dc -f docker-compose-8.6+gen5.yaml -p 86gen5 up --remove-orphans`

## router

- make sure that an env var `destinations` is present and hold `srv_api` and `ui` pointing to the "backend" (`core`) and "UI" (`fiori-app`) respectively