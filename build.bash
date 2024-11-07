#!/bin/bash


# TODO:
# - make auth optional
# - custom route for router -> needs to go into xs-security.json as well

rm -rf mta_archives &
npm run build -w core &
npm run build -w fiori-app &
wait

cd fiori-app
cp package.json package.json.bak
jq 'del(.devDependencies)' package.json > tmp.json && mv tmp.json package.json
npm i --workspaces=false
cd ..

# safeguard not installing dev deps
# npm i --production doesn't seem to work
cd router
cp package.json package.json.bak
jq 'del(.devDependencies)' package.json > tmp.json && mv tmp.json package.json
cd ..

mbt build

cd fiori-app
rm -rf node_modules
rm package-lock.json
mv package.json.bak package.json
cd ..

cd router
mv package.json.bak package.json
cd ..

# default everything back to normal
### only necessary for local builds, not for ci
npm i