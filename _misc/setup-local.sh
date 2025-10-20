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

# Either ENV-variables or default values
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-sap-btp-plugin}"

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
if [ "$1" = "--hybrid" ]; then
  cd core && cds deploy --profile hybrid && cd ..
else
  cd core && cds deploy && cd ..
fi