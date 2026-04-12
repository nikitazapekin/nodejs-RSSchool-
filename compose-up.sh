#!/usr/bin/env bash
set -euo pipefail

# Remove any stale Compose V1 containers; newer Docker releases stop exposing the legacy ContainerConfig field.
docker compose down --remove-orphans >/dev/null 2>&1 || true
docker rm -f rs-db-1 >/dev/null 2>&1 || true

if [[ $# -eq 0 ]]; then
  exec docker compose up --build
fi

exec docker compose "$@"
