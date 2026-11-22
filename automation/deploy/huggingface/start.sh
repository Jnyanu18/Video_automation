#!/bin/bash
set -e

echo "=== Starting GrowthOS AI Video Studio on Hugging Face Spaces ==="

# Set directories
mkdir -p /tmp/storage /tmp/users /tmp/models

# 1. Start Python FastAPI backend in the background on port 8793
export EDITOR_HOST=127.0.0.1
export EDITOR_PORT=8793
export EDITOR_SFX_DIR=/app/editor/assets/sfx
export EDITOR_USERS_DIR=/tmp/users
export EDITOR_UPLOADS_DIR=/tmp/storage
export HF_HOME=/tmp/models

echo "Starting AI Editor Engine (FastAPI) on port 8793..."
cd /app/editor
python api_server.py &
ENGINE_PID=$!

# Wait for FastAPI engine to become healthy
echo "Waiting for AI Editor Engine to come online..."
for i in {1..40}; do
  if curl -fsS http://127.0.0.1:8793/healthz >/dev/null 2>&1; then
    echo "AI Editor Engine is ONLINE and healthy!"
    break
  fi
  sleep 1
done

# 2. Start Node Dashboard Server (adapts to Render or Hugging Face PORT)
echo "Starting Dashboard Gateway on port ${PORT:-10000}..."
cd /app
export HOST=0.0.0.0
export PORT="${PORT:-10000}"
export WEB_DIR=/app/web/dist
export UPLOAD_DIR=/tmp/storage
export EDITOR_URL=http://127.0.0.1:8793
export EDITOR_USERS_DIR=/tmp/users
export EDITOR_UPLOADS_DIR=/tmp/storage
export TRUST_PROXY="true"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"

exec node server/cloud-stack.cjs
