#!/bin/bash
cd /home/ubuntu/apps/barestack-app
pkill -f "serve.cjs" 2>/dev/null || true
sleep 1
nohup node serve.cjs > /tmp/barestack-app.log 2>&1 &
echo "BareStack app started (production static server)"
