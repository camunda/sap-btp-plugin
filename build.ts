let env = Deno.args[0]
if (env !== "demo") env = "prod"
console.log(`%c//> building for env: ${env}`, "color: darkgreen; background-color: lightgray")

// to do:
// - custom route for router -> needs to go into xs-security.json as well

try {
  await Deno.remove("mta_archives", { recursive: true })
} catch (err) {
  console.log("%c//> probably no mta_archives folder to remove", "color: yellow", err)
}

requireAuth(env === "prod" ? true : false)

await Promise.all([
  buildCore(),
  buildApp(),
])
await Promise.all([
  rmDevDeps("core"),
  rmDevDeps("fiori-app"),
])

buildMbt()

await Promise.all([
  putPkgJsonBack("core"),
  putPkgJsonBack("fiori-app"),
])

// save post install step in CI to save time
// env var is set in yaml file
Deno.env.get("ci") !== undefined && postInstall()

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
  const newContent = content.replace(searchValue, replaceValue)
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
