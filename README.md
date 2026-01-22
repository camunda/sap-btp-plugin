# Camunda BTP Plugin

## dev time

prerequisite: create local destinations in `router/default-env.json` (not under version control!)

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

# boot up a c8 version locally from /test/docker
$> cd test/docker/...; docker-compose up

# boot up a the postgresql server
$> cd test/docker/pgstandalone; docker-compose up

# prepare local development with local postgres server and disabled auth strategy
$> sh _misc/setup-local.sh

# start the btp plugin... docker ports differ a bit from JAVA Node Camunda version, therefor override tasklist base url
$> CAMUNDA_TASKLIST_BASE_URL=http://localhost:8088 npm run start:local

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
- UI5 frontend: port 8080
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

### E2E Testing

#### Codegen

Using the codegenerator for creating new tests run `npm run e2e:codegen`. A chromium instance starts, where you can use the ui and in background your click path is collected in form of playwright testcode.

#### Run tests

Run `npm run e2e:test` to execute playwright tests in a headless browser instance.