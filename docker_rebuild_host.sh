#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:-arqma-network9}"
NAME="${2:-arqma-network9}"

echo "🧹 Removing old container/image if exist…"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker rmi -f "$IMAGE" >/dev/null 2>&1 || true

echo "🧱 Building image $IMAGE…"
docker build -t "$IMAGE" .

echo "▶️  Running $NAME on host network…"
docker run -d --name "$NAME" --restart unless-stopped --network host --env-file ./.env "$IMAGE"

echo "✅ Done. Bot + map should be up. Map: http://localhost:8899/"
