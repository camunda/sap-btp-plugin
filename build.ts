import { parseArgs } from "jsr:@std/cli/parse-args"
const args = parseArgs(Deno.args, {
  alias: {
    env: "e",
    version: "v",
    route: "r",
    help: "h",
  },
  default: {
    env: "prod",
    version: "8.7.0",
    route: "camunda-btp-integration",
  },
})

if (args.help) {
  console.log(`
    usage: deno -A build.ts [options]
    options:
      -e, --env       environment to build for, default is "${args.env}"
      -v, --version   app version, default is "${args.version}"
      -r, --route     btp integration route, default is "${args.route}"
    
    example:
      deno -A build.ts -e demo -v 8.7.11 -r my-entry-point
`)
  Deno.exit(0)
}

const allZeebeCredentials = [
  "ZEEBE_ADDRESS",
  "ZEEBE_CLIENT_ID",
  "ZEEBE_CLIENT_SECRET",
  "ZEEBE_AUTHORIZATION_SERVER_URL",
  "ZEEBE_REST_ADDRESS",
  "ZEEBE_GRPC_ADDRESS",
  "ZEEBE_TOKEN_AUDIENCE",
]

const allCamundaCredentials = [
  "CAMUNDA_CLUSTER_ID",
  "CAMUNDA_CLIENT_ID",
  "CAMUNDA_CLIENT_SECRET",
  "CAMUNDA_CLUSTER_REGION",
  "CAMUNDA_CREDENTIALS_SCOPES",
  "CAMUNDA_TASKLIST_BASE_URL",
  "CAMUNDA_OPTIMIZE_BASE_URL",
  "CAMUNDA_OPERATE_BASE_URL",
  "CAMUNDA_OAUTH_URL",
]

let env = args.env
if (env !== "demo") env = "prod"
console.log(`%c//> building for env: ${env}`, "color: darkgreen; background-color: lightgray")

const version = args.version
console.log(`%c//> version: ${version}`, "color: darkgreen")

const route = args.route
console.log(`%c//> route: ${route}`, "color: darkgreen")

try {
  // don't run in CI
  !Deno.env.get("ci") && await Deno.remove("mta_archives", { recursive: true })
} catch (err) {
  console.log("%c//> probably no mta_archives folder to remove", "color: yellow", err)
}

// deploy- and runtime specific files
Deno.copyFileSync("./mta.yaml.example", "./mta.yaml")
Deno.copyFileSync("./xs-security.json.example", "./xs-security.json")

const creds = checkCamundaCredentials(allCamundaCredentials, allZeebeCredentials)
if (creds.camunda) {
  console.info("%c//> Camunda credentials found", "color: green")
  injectCamundaCredentials(allCamundaCredentials)
}
if (creds.zeebe) {
  console.info("%c//> Zeebe credentials found", "color: green")
  injectCamundaCredentials(allZeebeCredentials)
}

if (!creds.camunda && !creds.zeebe) {
  console.error("%c//> missing Camunda credentials!", "color:red")
  Deno.exit(1)
}

// both for mta.yaml
injectVersion(version)
injectRoute(route)

// across all cds files and xs-app.jsons
requireAuth(env === "prod" ? true : false)

await Promise.all([
  buildCore(), //> essentially cds build --for production
  buildApp(), //> this builds the library into the app for unified deployment
])
// ensure we're not vendoring too much
await Promise.all([
  rmDevDeps("router"),
  rmDevDeps("core"),
  rmDevDeps("fiori-app"),
])

// mtar build
buildMbt()

await Promise.all([
  putPkgJsonBack("router"),
  putPkgJsonBack("core"),
  putPkgJsonBack("fiori-app"),
])

// save post install step in CI to save time
// env var is set in yaml file
!Deno.env.get("ci") && postInstall()

// ######################################## //

function checkCamundaCredentials(_allCamundaCredentials = allCamundaCredentials, _allZeebeCredentials = allZeebeCredentials) {
  return {
    camunda: _allCamundaCredentials.every((key) => Deno.env.get(key) !== undefined),
    zeebe: _allZeebeCredentials.every((key) => Deno.env.get(key) !== undefined),
  }
}

function injectCamundaCredentials(credentials: typeof allCamundaCredentials | typeof allZeebeCredentials) {
  console.log(`%c//> injecting credentials ${credentials}`, "color: darkgreen")
  let content = Deno.readTextFileSync("./mta.yaml")
  credentials.forEach((key) => {
    content = content.replace(new RegExp(`${key}:.*`), `${key}: ${Deno.env.get(key)}`)
  })
  Deno.writeTextFileSync("./mta.yaml", content)
}

function injectRoute(route: string) {
  _replace("./xs-security.json", "<btp-integration-route>", route)
  _replace("./mta.yaml", "<btp-integration-route>", route)
}

function injectVersion(version: string) {
  const mangledVersion = version.replace(/\./g, "_").substring(0,3)
  _replace("./xs-security.json", "<app-version>", mangledVersion)
  _replace("./mta.yaml", "<app-version>", `${mangledVersion}`) //> we want to denote the compatible Camunda version here
  _replace("./mta.yaml", "<unique-app-version>", version) //> this is an actual increment
}

function requireAuth(yes = true) {
  const authenticationMethod = yes ? "route" : "none"
  ;["./fiori-app/xs-app.json", "./router/xs-app.json"].forEach((file) => {
    _replace(file, /"authenticationMethod": .*/g, '"authenticationMethod": "' + authenticationMethod + '",')
  })
  ;["./core/srv/bpmn.cds", "./core/srv/inbound.cds"].forEach((file) => {
    _toggleComment(file, yes)
  })
}

function _replace(file: string, searchValue: string | RegExp, replaceValue: string) {
  const content = Deno.readTextFileSync(file)
  let newContent = ""
  if (typeof searchValue === "string") {
    newContent = content.replaceAll(searchValue, replaceValue)
  } else {
    newContent = content.replace(searchValue, replaceValue)
  }
  Deno.writeTextFileSync(file, newContent)
}

function _toggleComment(file: string, comment: boolean) {
  const regex = /^(.*annotate .* with .*)$/gm
  const content = Deno.readTextFileSync(file)
  // either insert or leave the "append $service with ..." line
  // depending on comment input var and whether it's already commented out
  const newContent = content.replace(regex, (match, p1) => {
    if (comment) {
      return match.startsWith("//") ? match.replace(/^\/\/\s*/, "") : match
    } else {
      return match.startsWith("//") ? match : `// ${match}`
    }
  })
  Deno.writeTextFileSync(file, newContent)
}

function buildCore() {
  console.log("%c//> starting core build...", "color: darkgreen; background-color: lightgray")
  const cmd = new Deno.Command("npm", {
    args: ["run", "build", "-w", "core"],
  })
  const { code, stdout, stderr } = cmd.outputSync()
  if (code !== 0) {
    console.error("%c//> core build error", "color:red", new TextDecoder().decode(stderr))
    Deno.exit(code)
  } else {
    console.log("%c//> core build success", "color: green; font-weight: bold", new TextDecoder().decode(stdout))
  }
}

function buildApp() {
  console.log("%c//> starting app build...", "color: darkgreen; background-color: lightgray")
  const cmd = new Deno.Command("npm", {
    args: ["run", "build", "-w", "fiori-app"],
  })
  const { code, stdout, stderr } = cmd.outputSync()
  if (code !== 0) {
    console.error("%c//> app build error", "color:red", new TextDecoder().decode(stderr))
    Deno.exit(code)
  } else {
    console.log("%c//> app build success", "color: green; font-weight: bold", new TextDecoder().decode(stdout))
  }
}

function buildMbt() {
  console.log("%c//> starting mbt build...", "color: darkgreen; background-color: lightgray")
  const cmd = new Deno.Command("npx", {
    args: ["mbt", "build"],
  })
  const { code, stdout, stderr } = cmd.outputSync()
  if (code !== 0) {
    console.error("%c//> mbt build error", "color:red", new TextDecoder().decode(stderr))
    Deno.exit(code)
  } else {
    console.log("%c//> mbt build success", "color: green; font-weight: bold", new TextDecoder().decode(stdout))
  }
}

function rmDevDeps(dir: string) {
  const packageJsonPath = `${dir}/package.json`
  const packageJsonBakPath = `${dir}/package.json.bak`
  const packageJson = JSON.parse(Deno.readTextFileSync(packageJsonPath))
  Deno.writeTextFileSync(
    packageJsonBakPath,
    JSON.stringify(packageJson, null, 2),
  )
  delete packageJson.devDependencies
  Deno.writeTextFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
}

function putPkgJsonBack(dir: string) {
  const packageJsonPath = `${dir}/package.json`
  const packageJsonBakPath = `${dir}/package.json.bak`
  Deno.renameSync(packageJsonBakPath, packageJsonPath)
}

function postInstall() {
  console.log("%c//> starting post install...", "color: darkgreen; background-color: lightgray")
  const cmd = new Deno.Command("npm", {
    args: ["i"],
  })
  const { code, stdout, stderr } = cmd.outputSync()
  if (code !== 0) {
    console.error(`%c//> post install error`, "color:red", new TextDecoder().decode(stderr))
    Deno.exit(code)
  } else {
    console.log(`%c//> post install success`, "color: green; font-weight: bold", new TextDecoder().decode(stdout))
  }
}
