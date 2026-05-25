#!/bin/bash
set -e

# BareStack CRM - One-Line Installer
# Usage: curl -sSL https://raw.githubusercontent.com/anirudhprashant/barestack-app/main/install.sh | bash

echo "🚀 Installing BareStack CRM..."

# Get the directory where this script is running from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Visit https://nodejs.org"; exit 1; }

# Install npm dependencies
echo "📦 Installing dependencies..."
npm install

# Download PocketBase if not present
if [ ! -f "./pocketbase" ]; then
    echo "📥 Downloading PocketBase..."
    PB_VERSION="0.22.7"
    if [ "$(uname)" = "Darwin" ]; then
        PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_darwin_arm64.zip"
    else
        PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_linux_amd64.zip"
    fi
    curl -L "$PB_URL" -o pocketbase.zip
    unzip -o pocketbase.zip pocketbase
    rm pocketbase.zip
    chmod +x pocketbase
fi

# Build the app
echo "🔨 Building BareStack CRM..."
npm run build

# Create a start script
cat > start.sh << 'STARTSCRIPT'
#!/bin/bash
echo "📡 Starting PocketBase on port 8092..."
./pocketbase serve --http="0.0.0.0:8092" &
PB_PID=$!

echo "🌐 Starting BareStack on port 8080..."
npm run preview -- --port 8080 --host 0.0.0.0 &
APP_PID=$!

echo ""
echo "✅ BareStack CRM is running!"
echo "   App:    http://localhost:8080"
echo "   API:    http://localhost:8092"
echo "   Admin:  http://localhost:8092/_/"
echo ""
echo "📝 First-time setup:"
echo "   1. Go to http://localhost:8092/_/"
echo "   2. Create an admin account"
echo "   3. Create a 'users' collection with email/password auth"
echo "   4. Create collections: contacts, deals, projects, tasks, invoices, time_entries, expenses, notes, recent_activity (all with 'user' relation to users)"
echo ""
echo "Press Ctrl+C to stop both services"

trap "kill $PB_PID $APP_PID 2>/dev/null; exit" INT TERM
wait
STARTSCRIPT

chmod +x start.sh

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start BareStack CRM, run:"
echo "   ./start.sh"
echo ""
echo "Or run individually:"
echo "   ./pocketbase serve --http='0.0.0.0:8092'  # Backend on :8092"
echo "   npm run preview -- --port 8080             # Frontend on :8080"
