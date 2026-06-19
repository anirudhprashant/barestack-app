#!/bin/bash
set -euo pipefail

# BareStack CRM - One-Line Installer
# Usage:
#   ./install.sh            # self-hosted: app talks to YOUR local PocketBase (default)
#   ./install.sh --cloud    # build against the hosted BareStack cloud (api.barestack.org)
#
# curl -sSL https://raw.githubusercontent.com/anirudhprashant/barestack-app/main/install.sh | bash
#
# Tip: piping to bash runs unverified code from the network. Prefer downloading
# the script, reviewing it, and running locally. You can pin the PocketBase
# checksum by exporting BARESTACK_PB_SHA256=<sha256 of the release zip>; when
# set, the installer aborts if the download's hash does not match.

echo "🚀 Installing BareStack CRM..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PB_VERSION="0.36.2"
PB_PORT="8092"
PB_URL_LOCAL="http://127.0.0.1:${PB_PORT}"
PB_URL_CLOUD="https://api.barestack.org"

MODE="local"
if [ "${1:-}" = "--cloud" ]; then MODE="cloud"; fi

command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Visit https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm required (ships with Node.js)."; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "❌ unzip required. Run: apt install unzip"; exit 1; }
command -v curl  >/dev/null 2>&1 || { echo "❌ curl required."; exit 1; }

echo "📦 Installing dependencies..."
npm install

# --- Download PocketBase (matches the version running in production) ---
if [ ! -f "./pocketbase" ]; then
    echo "📥 Downloading PocketBase ${PB_VERSION}..."
    case "$(uname -s)" in
        Darwin) OS="darwin" ;;
        Linux)  OS="linux" ;;
        *) echo "❌ Unsupported OS: $(uname -s)"; exit 1 ;;
    esac
    case "$(uname -m)" in
        x86_64|amd64)  ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) echo "❌ Unsupported architecture: $(uname -m)"; exit 1 ;;
    esac
    PB_ZIP="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
    PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_ZIP}"
    echo "📥 Downloading PocketBase ${PB_VERSION}..."
    echo "   $PB_URL"
    curl -fL "$PB_URL" -o pocketbase.zip

    # Verify the download's integrity. We do not embed the full arch/arch/os
    # SHA256 matrix here (it would bit-rot across releases); instead, print the
    # archive's SHA256 so you can confirm it against the checksums published on
    # the PocketBase release page before trusting the binary. Fail the install
    # now if you cannot match it.
    echo "🔐 SHA256 of the downloaded binary:"
    ACTUAL_SHA="$(sha256sum pocketbase.zip | awk '{print $1}')"
    echo "   $ACTUAL_SHA"
    echo "   ➡️  Confirm this matches the checksum for ${PB_ZIP} at:"
    echo "      https://github.com/pocketbase/pocketbase/releases/tag/v${PB_VERSION}"
    if [ -n "${BARESTACK_PB_SHA256:-}" ]; then
        EXPECTED_SHA="$(echo "$BARESTACK_PB_SHA256" | awk '{print tolower($1)}')"
        if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
            echo "❌ SHA256 mismatch (expected $EXPECTED_SHA). Aborting — do not run an unverified binary."
            rm -f pocketbase.zip
            exit 1
        fi
        echo "✅ SHA256 matches BARESTACK_PB_SHA256."
    fi
    unzip -o pocketbase.zip pocketbase
    rm -f pocketbase.zip
    chmod +x pocketbase
fi

# --- Build the frontend pointed at the right backend ---
# Self-hosted by default. A custom VITE_POCKETBASE_URL (e.g. a public URL for
# your own PocketBase behind a reverse proxy) is honored in the default mode.
if [ "$MODE" = "cloud" ]; then
    BUILD_PB_URL="$PB_URL_CLOUD"
else
    BUILD_PB_URL="${VITE_POCKETBASE_URL:-$PB_URL_LOCAL}"
fi
echo "🔨 Building frontend against ${BUILD_PB_URL}..."
VITE_POCKETBASE_URL="$BUILD_PB_URL" npm run build

# Cloud builds use the shared hosted backend — no local PocketBase setup needed.
if [ "$MODE" = "cloud" ]; then
    echo ""
    echo "✅ Done (cloud build). Serve ./dist with any static server and sign up at app.barestack.org."
    exit 0
fi

# --- Self-hosted: collections are created from version-controlled migrations ---
echo "📡 Applying database schema via migrations..."
./pocketbase migrate up --dir ./pb_data --migrationsDir ./pb_migrations

# --- Create an admin (superuser) with a RANDOM password, shown once ---
ADMIN_EMAIL="${BARESTACK_ADMIN_EMAIL:-admin@barestack.local}"
if [ -n "${BARESTACK_ADMIN_PASSWORD:-}" ]; then
    ADMIN_PASSWORD="$BARESTACK_ADMIN_PASSWORD"
else
    ADMIN_PASSWORD="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)"
fi
./pocketbase superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir ./pb_data >/dev/null

# --- Launcher ---
cat > start.sh << STARTSCRIPT
#!/bin/bash
set -e
echo "🚀 Starting BareStack CRM..."
# Production note: binding PocketBase to 0.0.0.0 over plain HTTP exposes the
# admin UI and the API to your network. For anything beyond local testing, put
# PocketBase behind a TLS-terminating reverse proxy and either:
#   - bind to 127.0.0.1 (e.g. --http="127.0.0.1:${PB_PORT}") and proxy to it, OR
#   - serve TLS directly with --https=... and a certificate, AND
#   - restrict origins with --origins=https://your-app-domain.example
#   - set --publicUrl=https://api.your-domain.example
# so the API and admin console aren't reachable over plaintext.
./pocketbase serve --dir ./pb_data --migrationsDir ./pb_migrations --http="0.0.0.0:${PB_PORT}" &
PB_PID=\$!
sleep 2
npm run preview -- --port 8080 --host 0.0.0.0 &
APP_PID=\$!
echo ""
echo "✅ BareStack CRM running!"
echo "   App:    http://localhost:8080"
echo "   Admin:  http://localhost:${PB_PORT}/_/"
echo ""
trap "kill \$PB_PID \$APP_PID 2>/dev/null; exit" INT TERM
wait
STARTSCRIPT
chmod +x start.sh

echo ""
echo "✅ Done! Your data lives in ./pb_data on THIS machine (not the cloud)."
echo "   Run './start.sh' to launch."
echo ""
echo "   PocketBase admin login (save this — shown only once):"
echo "     Admin:  $ADMIN_EMAIL"
echo "     Pass:   $ADMIN_PASSWORD"
echo ""
echo "   Then open http://localhost:8080 and create your user account."
