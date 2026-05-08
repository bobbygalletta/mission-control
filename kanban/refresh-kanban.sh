#!/bin/bash
# refresh-kanban.sh - Refreshes the Kanban browser tab (Chrome or Safari)

echo "Waiting for server to be ready..."
sleep 3

echo "Looking for Kanban tab..."

# Try Chrome
CHROME_OUT=$(osascript -e '
tell application "Google Chrome"
    set targetPort to "8788"
    set foundTab to false
    repeat with w from 1 to (count of windows)
        repeat with t from 1 to (count of tabs of window w)
            if (URL of tab t of window w contains targetPort) then
                reload tab t of window w
                set foundTab to true
                exit repeat
            end if
        end repeat
        if foundTab is true then exit repeat
    end repeat
    if not foundTab then return "NOT_FOUND"
end tell
' 2>&1)

if [[ "$CHROME_OUT" == "NOT_FOUND" ]]; then
    # Try Safari
    SAFARI_OUT=$(osascript -e '
    tell application "Safari"
        set targetPort to "8788"
        set foundTab to false
        repeat with w from 1 to (count of windows)
            repeat with t from 1 to (count of tabs of window w)
                if (URL of tab t of window w contains targetPort) then
                    reload tab t of window w
                    set foundTab to true
                    exit repeat
                end if
            end repeat
            if foundTab is true then exit repeat
        end repeat
        if not foundTab then return "NOT_FOUND"
    end tell
    ' 2>&1)
    
    if [[ "$SAFARI_OUT" == "NOT_FOUND" ]]; then
        echo "Tab not found in Chrome or Safari. Please refresh manually at http://100.103.22.35:8788"
    else
        echo "Kanban refreshed (Safari)"
    fi
else
    echo "Kanban refreshed (Chrome)"
fi