#!/bin/bash
# Deploy/restart the BareStackOS frontend on the production host.
#
# Production is managed by PM2 (app name: barestack-app), NOT raw nohup.
# A bare `node serve.cjs &` here would spawn a duplicate that fights the
# PM2-managed process for port 8084 — so this script drives PM2 instead.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PM2_APP="${PM2_APP:-barestack-app}"
# Backend the built frontend talks to (baked in at build time).
BUILD_PB_URL="${VITE_POCKETBASE_URL:-https://api.barestack.org}"

cd "$APP_DIR"

echo "📥 Pulling latest..."
git pull --ff-only

echo "📦 Installing deps..."
npm ci

echo "🔨 Building against ${BUILD_PB_URL}..."
VITE_POCKETBASE_URL="$BUILD_PB_URL" npm run build

echo "🔁 Restarting via PM2 (${PM2_APP})..."
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
else
    pm2 start serve.cjs --name "$PM2_APP"
fi
pm2 save

# Give PM2 a moment to bind the port, then verify the server actually serves
# a 200. A deploy that reports success while the server is down is worse than
# a loud failure, so this gates the exit code.
sleep 2
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-8084}/" || echo 000)"
if [ "$code" = "200" ]; then
    echo "✅ Deployed. Health: serve.cjs (:${PORT:-8084}) -> ${code}"
else
    echo "❌ Deploy health check FAILED: serve.cjs (:${PORT:-8084}) -> ${code}" >&2
    echo "   Check: pm2 logs ${PM2_APP}" >&2
    exit 1
fi
