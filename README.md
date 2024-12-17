# Camunda BTP Integration

## dev time - local setup

...w/o authN and authZ

## dev time - hybrid setup

...so that most importantly `authN` and `authZ` work against the BTP `xsuaa`!

create necessary `xsuaa` service instance:

```shell
# in / of the proj
$> cf cs xsuaa application uaa-hybrid-instance -c xs-security.json
$> cds bind -2 uaa-hybrid-instance # auto-creates a service key
# ... creates .cdsrc-private.json
$> cds bind --exec npm start

# -> http://localhost:5001
```

- dev-approuter: 5001 (not 5000, b/c of macOS port issue)
- fiori app: served w/ approuter on 5002
- cap backend: auto-started via dev-approuter on 4004

## dev time - common settings

- `process.env.DISABLE_CAMUNDA` turns off C8 connectivity
- `DEBUG=camunda` or `cds.debug("camunda")` will trigger debug log output

- `test/.env-localdev` holds the connection info to C8 local cluster for flight-mode-dev &rarr; `source test/.env-localdev`

### local C8 SM

in folder `test/docker`, all local dev resources are located

#### 8.6

- https://github.com/camunda/camunda-platform/blob/8.6%2Bgen5/
- `dc -f docker-compose-8.6+gen5.yaml -p 86gen5 up --remove-orphans`

### router

- make sure that an env var `destinations` is present and hold `srv_api` and `ui` pointing to the "backend" (`core`) and "UI" (`fiori-app`) respectively
