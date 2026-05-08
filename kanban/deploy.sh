#!/bin/bash
# deploy.sh - Build, deploy to PM2, and auto-refresh Bobby's browser

cd ~/agent-mission-control/kanban

echo "Building..."
npm run build 2>&1

if [ $? -eq 0 ]; then
    echo "Build succeeded. Deploying to PM2..."
    pm2 restart kanban 2>&1
    
    echo "Refreshing Bobby's Chrome..."
    osascript -e '
    tell application "Google Chrome"
        set targetURL to "localhost:8788"
        
        -- Find the tab with Kanban
        set foundTab to false
        repeat with w from 1 to (count of windows)
            repeat with t from 1 to (count of tabs of window w)
                if (URL of tab t of window w contains targetURL) then
                    reload tab t of window w
                    set foundTab to true
                    exit repeat
                end if
            end repeat
            if foundTab is true then exit repeat
        end repeat
        
        if not foundTab then
            reload active tab of window 1
        end if
    end tell
    ' 2>&1
    
    echo "Done! Bobby's browser refreshed automatically."
else
    echo "Build failed!"
    exit 1
fi
