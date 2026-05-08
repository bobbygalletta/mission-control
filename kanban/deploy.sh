#!/bin/bash
# deploy.sh - Build, deploy to PM2, and auto-refresh browser

cd ~/agent-mission-control/kanban

echo "Building..."
npm run build 2>&1

if [ $? -eq 0 ]; then
    echo "Build succeeded. Deploying to PM2..."
    pm2 restart kanban 2>&1
    
    echo "Waiting for server to start..."
    sleep 3
    
    echo "Refreshing Bobby's browser..."
    ./refresh-kanban.sh
    
    echo "Done!"
else
    echo "Build failed!"
    exit 1
fi