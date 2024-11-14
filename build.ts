let env = Deno.args[0]
if (env !== "demo") env = "prod"

try {
  await Deno.remove("mta_archives", { recursive: true })
} catch (err) {
  console.log("%c//> probably no mta_archives folder to remove", "color: yellow", err)
}

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

postInstall()

function buildCore() {
  console.log("%c//> starting core build...", "color: green; background-color: gray")
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
  console.log("%c//> starting app build...", "color: green; background-color: gray")
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
  console.log("%c//> starting mbt build...", "color: green; background-color: gray")
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
  console.log("%c//> starting post install...", "color: green; background-color: gray")
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
