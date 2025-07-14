#!/bin/bash

# setup cdsrc for local runtime
SRC="_misc/.cdsrc-private.json"
TARGETS=("./" "./core")

for TARGET in "${TARGETS[@]}"; do
  cp "$SRC" "$TARGET"
done

# make the @sap/approuter aware of traffic dispatching locally
cp "_misc/default-env.json" "./router"

# link the .cdsrc-private.json to the core folder
if [ ! -L "./core/.cdsrc-private.json" ]; then
  ln -s .cdsrc-private.json ./core
fi

# deploy sample data
cds deploy --profile hybrid