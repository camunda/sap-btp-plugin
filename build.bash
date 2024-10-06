#!/bin/bash

rm -rf mta_archives

cd core
npm i --workspaces=false --install-links
cp package.json package.json.bak
# sed -i '' 's|"@camunda8/user-task-worker": "file:../worker/user-task",|"@camunda8/user-task-worker": "*",|g; s|"@camunda8/websocket": "file:../websocket",|"@camunda8/websocket": "*",|g' package.json
sed -i '' 's|"@camunda8/websocket": "file:../websocket",|"@camunda8/websocket": "*",|g' package.json
cd ..

npm run build -w fiori-app

cd fiori-app
cp package.json package.json.bak
jq 'del(.devDependencies)' package.json > tmp.json && mv tmp.json package.json
npm i --workspaces=false
cd ..

mbt build

cd core
rm -rf node_modules
rm package-lock.json
mv package.json.bak package.json
cd ..

cd fiori-app
rm -rf node_modules
rm package-lock.json
mv package.json.bak package.json
cd ..

