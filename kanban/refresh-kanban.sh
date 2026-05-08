#!/bin/bash
# refresh-kanban.sh - Refreshes the Kanban Chrome tab specifically
# Finds the tab with localhost:8788 and reloads it, regardless of which tab is active

KANBAN_URL="localhost:8788"

# Use Chrome DevTools Protocol to find and reload the Kanban tab
osascript -e '
tell application "Google Chrome"
    set targetURL to "localhost:8788"
    
    -- Find the tab with Kanban
    set foundTab to false
    repeat with w from 1 to (count of windows)
        repeat with t from 1 to (count of tabs of window w)
            if (URL of tab t of window w contains targetURL) then
                -- Reload this specific tab
                reload tab t of window w
                set foundTab to true
                exit repeat
            end if
        end repeat
        if foundTab is true then exit repeat
    end repeat
    
    if not foundTab then
        -- Fallback: reload active tab of first window
        reload active tab of window 1
    end if
end tell
' 2>&1

echo "Kanban browser refreshed"
