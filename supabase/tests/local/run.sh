#!/bin/sh
# Applies the migrations to a fresh local database and runs the RLS tests. Prints PASS/FAIL lines.
#   PGHOST=/path/to/socket PGPORT=5433 sh supabase/tests/local/run.sh
set -e
here=$(cd "$(dirname "$0")" && pwd); root="$here/../.."
psql -q -U postgres -d postgres -c "drop database if exists viemo_test" -c "create database viemo_test" >/dev/null
psql -q -U postgres -d postgres -c "drop role if exists anon" -c "drop role if exists authenticated" -c "drop role if exists service_role" >/dev/null 2>&1 || true
run() { psql -q -v ON_ERROR_STOP=1 -U postgres -d viemo_test -f "$1" 2>&1; }
migrate() { psql -q -1 -v ON_ERROR_STOP=1 -U postgres -d viemo_test -f "$1" 2>&1; }
run "$here/00_supabase_stub.sql" >/dev/null
for m in "$root"/migrations/*.sql; do
  out=$(migrate "$m") || { echo "FAIL migration $(basename "$m")"; echo "$out" | grep -m3 ERROR; exit 1; }
  echo "PASS migration $(basename "$m") applied"
done
for t in "$here"/[1-9]*.sql; do run "$t" | sed -n 's/.*NOTICE:  //p; /ERROR/p'; done
