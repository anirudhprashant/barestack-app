#!/bin/bash
cd /home/ubuntu/apps/barestack-app
pkill -f "vite preview" 2>/dev/null || true
sleep 2
nohup npm run preview -- --port 8084 --host 0.0.0.0 > /tmp/barestack-app.log 2>&1 &
echo "BareStack app started on port 8084"
