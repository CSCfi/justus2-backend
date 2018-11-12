#!/bin/bash
set -e

# CREATE DATABASE justus;
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER appaccount;
    CREATE USER postgres;
    GRANT ALL PRIVILEGES ON DATABASE justus TO appaccount;
EOSQL

pattern='[0-9]{3}_.*[.]sql$'
for file in /sql/*; do
  if [[ $file =~ $pattern ]]; then
    cat $file | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
  fi
done
