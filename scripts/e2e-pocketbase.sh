#!/bin/bash
# Starts a throwaway PocketBase for the end-to-end tests: pinned version,
# fresh data directory, this repo's migrations and hooks. Used by
# playwright.config.ts (webServer) locally and in CI.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PB_VERSION="0.36.2"
DIR=".e2e"
mkdir -p "$DIR"

if [ ! -x "$DIR/pocketbase" ]; then
    case "$(uname -s)" in Darwin) OS=darwin ;; *) OS=linux ;; esac
    case "$(uname -m)" in arm64|aarch64) ARCH=arm64 ;; *) ARCH=amd64 ;; esac
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip" -o "$DIR/pb.zip"
    unzip -o -q "$DIR/pb.zip" pocketbase -d "$DIR"
    rm -f "$DIR/pb.zip"
fi

rm -rf "$DIR/pb_data"
"$DIR/pocketbase" migrate up --dir "$DIR/pb_data" --migrationsDir ./pb_migrations >/dev/null
exec "$DIR/pocketbase" serve --dir "$DIR/pb_data" --migrationsDir ./pb_migrations --hooksDir ./pb_hooks --http=127.0.0.1:8092
