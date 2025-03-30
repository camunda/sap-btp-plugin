# Camunda BTP Plugin

## dev time

prerequisite: create local destinations in `router/default-env.json` (not under version control!)

```json
{
  "PORT": 5001,
  "//destinations": "this is for dev time only!",
  "destinations": [
    {
      "name": "srv_api",
      "url": "http://localhost:4004",
      "forwardAuthToken": true
    },
    {
      "name": "ui",
      "url": "http://localhost:8080",
      "forwardAuthToken": true
    }
  ]
}
```

- build of both UI and backend are at deploy-time only  
  dev-time uses hot reload (UI) and `cds` tooling for serving the modules  
  deployment uses app router for both
  
### local setup

...w/o authN and authZ

```shell
# in / of the proj
# credentials for local c8
$> source test/.env-localdev

# boot up a c8 version locally from /test/docker
$> cd test/docker/...; docker-compose up

# start the btp plugin
$> npm run start:local

# -> http://localhost:5001
```

- the dev-approuter is used in place of the approuter  
  it in turn starts the CAP backend


### hybrid setup

...so that most importantly `authN` and `authZ` work against the BTP `xsuaa`!

create necessary `xsuaa` service instance:

```shell
# in / of the proj
$> cf login ...

$> cf cs xsuaa application uaa-hybrid-instance -c xs-security.json
$> cds bind -2 uaa-hybrid-instance # auto-creates a service key
# ... creates .cdsrc-private.json

# credentials for local c8
$> source test/.env-localdev

# boot up a c8 version locally from /test/docker
$> cd test/docker/...; docker-compose up

# runtime local, auth(n,z) from BTP
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

- UI5 frontend: port 8080
- CAP backend: port 4004

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
