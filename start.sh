#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Start Docker Desktop (or the Docker daemon), then try again."
    exit 1
fi

[ -f .env ] || cp .env.example .env

echo "Starting Smart-X. The first run builds images and can take a few minutes..."
if ! docker compose up -d --build; then
    echo "Startup failed. Run \"docker compose logs backend\" to see why."
    exit 1
fi

url="http://localhost:3000"
if command -v open >/dev/null 2>&1; then
    open "$url"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1
fi
echo "Running at $url. Logs: docker compose logs -f backend   Stop: ./stop.sh"
