#!/bin/bash
set -e

# BareStack CRM - One-Line Installer
# Usage: curl -sSL https://raw.githubusercontent.com/anirudhprashant/barestack-app/main/install.sh | bash

echo "🚀 Installing BareStack CRM..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Visit https://nodejs.org"; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "❌ unzip required. Run: apt install unzip"; exit 1; }

echo "📦 Installing dependencies..."
npm install

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

echo "🔨 Building BareStack CRM..."
VITE_POCKETBASE_URL="http://127.0.0.1:8092" npm run build

echo "📡 Setting up PocketBase (first-time only)..."
./pocketbase serve --dir ./pb_data --http="127.0.0.1:8092" &
PB_PID=$!
sleep 3

ADMIN_EMAIL="admin@barestack.local"
ADMIN_PASSWORD="admin123456"

./pocketbase admin create "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir ./pb_data 2>/dev/null || true

echo "🔧 Creating collections..."

TOKEN=$(curl -s -X POST "http://127.0.0.1:8092/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

create_collection() {
    local json="$1"
    curl -s -X POST "http://127.0.0.1:8092/api/collections" \
        -H "Content-Type: application/json" \
        -H "Authorization: $TOKEN" \
        -d "$json" > /dev/null
    echo "   ✓ Created: $(echo $json | grep -o '"name":"[^"]*"' | cut -d'"' -f4)"
}

echo "   Creating contacts..."
create_collection '{"name":"contacts","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"name","type":"text","required":true},{"name":"email","type":"email"},{"name":"phone","type":"text"},{"name":"company","type":"text"},{"name":"notes","type":"text"}]}'

echo "   Creating deals..."
create_collection '{"name":"deals","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"contact_id","type":"text","required":true},{"name":"value","type":"number"},{"name":"stage","type":"select","options":{"maxSelect":1,"values":["Lead","Qualified","Proposal","Won","Lost"]}},{"name":"last_interaction","type":"date"}]}'

echo "   Creating projects..."
create_collection '{"name":"projects","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"client_id","type":"text"},{"name":"name","type":"text","required":true},{"name":"status","type":"select","options":{"maxSelect":1,"values":["Active","Completed","On Hold"]}},{"name":"budget","type":"number"},{"name":"estimated_hours","type":"number"},{"name":"description","type":"text"}]}'

echo "   Creating tasks..."
create_collection '{"name":"tasks","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"project_id","type":"text"},{"name":"title","type":"text","required":true},{"name":"description","type":"text"},{"name":"status","type":"select","options":{"maxSelect":1,"values":["Todo","In Progress","Done"]}},{"name":"priority","type":"select","options":{"maxSelect":1,"values":["Low","Medium","High"]}},{"name":"due_date","type":"date"}]}'

echo "   Creating invoices..."
create_collection '{"name":"invoices","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"client_id","type":"text","required":true},{"name":"invoice_number","type":"text","required":true},{"name":"issue_date","type":"date","required":true},{"name":"due_date","type":"date","required":true},{"name":"line_items","type":"json"},{"name":"tax_rate","type":"number"},{"name":"status","type":"select","options":{"maxSelect":1,"values":["Draft","Sent","Paid","Overdue"]}},{"name":"paid_date","type":"date"},{"name":"payment_method","type":"text"},{"name":"notes","type":"text"}]}'

echo "   Creating time_entries..."
create_collection '{"name":"time_entries","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"project_id","type":"text"},{"name":"description","type":"text"},{"name":"hours","type":"number","required":true},{"name":"date","type":"date","required":true}]}'

echo "   Creating expenses..."
create_collection '{"name":"expenses","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"description","type":"text","required":true},{"name":"amount","type":"number"},{"name":"category","type":"select","options":{"maxSelect":1,"values":["Travel","Meals","Software","Office","Other"]}},{"name":"date","type":"date","required":true},{"name":"project_id","type":"text"},{"name":"receipt","type":"text"}]}'

echo "   Creating notes..."
create_collection '{"name":"notes","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"contact_id","type":"text"},{"name":"project_id","type":"text"},{"name":"content","type":"text","required":true}]}'

echo "   Creating recent_activity..."
create_collection '{"name":"recent_activity","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"type","type":"text","required":true},{"name":"description","type":"text","required":true},{"name":"timestamp","type":"date","required":true}]}'

echo "   Creating import_batches..."
create_collection '{"name":"import_batches","type":"base","listRule":"@request.auth.id != \"\"","createRule":"@request.auth.id != \"\"","updateRule":"@request.auth.id = user","deleteRule":"@request.auth.id = user","schema":[{"name":"user","type":"text","required":true,"options":{"min":20,"max":20}},{"name":"filename","type":"text"},{"name":"contacts_count","type":"number"},{"name":"duplicates_count","type":"number"}]}'

kill $PB_PID 2>/dev/null || true
sleep 1

cat > start.sh << 'STARTSCRIPT'
#!/bin/bash
set -e
echo "🚀 Starting BareStack CRM..."
./pocketbase serve --dir ./pb_data --http="0.0.0.0:8092" &
PB_PID=$!
sleep 2
npm run preview -- --port 8080 --host 0.0.0.0 &
APP_PID=$!
echo ""
echo "✅ BareStack CRM running!"
echo "   App:    http://localhost:8080"
echo "   Admin:  http://localhost:8092/_/"
echo "   Login:  admin@barestack.local / admin123456"
echo ""
trap "kill $PB_PID $APP_PID 2>/dev/null; exit" INT TERM
wait
STARTSCRIPT
chmod +x start.sh

echo ""
echo "✅ Done! Run './start.sh' to launch."
echo "   Admin:  admin@barestack.local"
echo "   Pass:   admin123456"
