#!/usr/bin/env bash
# Local dev: SQLite + local disk under services/api/.data (override EDITOR_DATA_DIR)
cd "$(dirname "$0")" && exec python3 -m uvicorn editor_api.main:app_factory --factory --port "${PORT:-8000}" "$@"
