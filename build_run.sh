#!/usr/bin/env bash
set -euo pipefail
IMAGE="${IMAGE:-arqma-network9}"
NAME="${NAME:-arqma-network9}"
ENV_FILE="${ENV_FILE:-.env}"

echo "🧹 Removing old container/image (if any)..."
docker rm -f "$NAME" 2>/dev/null || true
docker rmi -f "$IMAGE" 2>/dev/null || true

echo "🏗️ Building image (no cache)..."
docker build --no-cache -t "$IMAGE" .

echo "🚀 Running on host network with host .env..."
if [ -f "$ENV_FILE" ]; then
  docker run -d --name "$NAME" --restart unless-stopped --network host --env-file "$ENV_FILE" "$IMAGE"
else
  echo "⚠️  $ENV_FILE not found; running without env-file"
  docker run -d --name "$NAME" --restart unless-stopped --network host "$IMAGE"
fi

echo "✅ Up. Check http://localhost:${MAP_PORT:-8899}/"
