#!/bin/sh
# Starts the face service in the background, then the API (used by the Dockerfile).
set -e

cd /app/ai-service
/opt/venv/bin/gunicorn app:app --bind 127.0.0.1:8000 --workers 1 --threads 4 --timeout 120 &

cd /app/backend
exec node src/server.js
