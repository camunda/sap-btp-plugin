#!/bin/bash

# setup cdsrc for local runtime
SRC="_misc/.cdsrc-private.json"
TARGETS=("./" "./core")

for TARGET in "${TARGETS[@]}"; do
  cp "$SRC" "$TARGET"
done

# make the @sap/approuter aware of traffic dispatching locally
cp "_misc/default-env.json" "./router"

# generate types
cd core && npx @cap-js/cds-typer "*" && cd ..

DB_NAME="sap-btp-plugin"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5433"
DB_PASS="postgres"

export PGPASSWORD="$DB_PASS"

# Prüfen, ob DB existiert
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "Database '${DB_NAME}' exists already. Continuing..."
else
  echo "Database '${DB_NAME}' missing. Creating..."
  createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
  echo "Database '${DB_NAME}' has been created."
fi

# deploy sample data
cd core && cds deploy --profile hybrid && cd ..
