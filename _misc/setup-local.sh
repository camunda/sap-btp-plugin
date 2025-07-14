#!/bin/bash

# setup cdsrc for local runtime
SRC="_misc/.cdsrc-private.json"
TARGETS=("./" "./core")

for TARGET in "${TARGETS[@]}"; do
  cp "$SRC" "$TARGET"
done

# make the @sap/approuter aware of traffic dispatching locally
cp "_misc/default-env.json" "./router"

# deploy sample data
cd core && cds deploy --profile hybrid && cd ..
