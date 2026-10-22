#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:-arqma-network9}"
NAME="${NAME:-arqma-network9}"

echo "==> Stopping/removing old container (if any) ..."
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> Removing old image (if any) ..."
docker rmi -f "$IMAGE" >/dev/null 2>&1 || true

echo "==> Building new image: $IMAGE ..."
docker build -t "$IMAGE" .

echo "==> Running container: $NAME (host network) ..."
if [ -f .env ]; then
  echo "   using .env from current dir"
  docker run -d --name "$NAME" --restart unless-stopped --network host --env-file .env "$IMAGE"
else
  docker run -d --name "$NAME" --restart unless-stopped --network host "$IMAGE"
fi

echo "==> Done. Map: http://localhost:8899/   JSON: /countrys_json"
