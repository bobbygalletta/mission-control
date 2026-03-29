#!/bin/bash
# Called at 9am to remind about missed meals from yesterday
cd /Users/bobbygalletta/agent-mission-control

# Get yesterday's data
YESTERDAY=$(date -v-1d "+%b %d, %Y")
DATA=$(cat data/habits.json 2>/dev/null)

# Extract yesterday's entry (simple grep approach)
YESTERDAY_DATA=$(echo "$DATA" | grep -o "\"date\":\"$YESTERDAY\"[^}]*}" | head -1)

# Check which meals were missed
BREAKFAST=$(echo "$YESTERDAY_DATA" | grep -o '"breakfast":[^,}]*' | cut -d: -f2)
LUNCH=$(echo "$YESTERDAY_DATA" | grep -o '"lunch":[^,}]*' | cut -d: -f2)
DINNER=$(echo "$YESTERDAY_DATA" | grep -o '"dinner":[^,}]*' | cut -d: -f2)

MISSED=""
if [ "$BREAKFAST" = "false" ]; then MISSED="$MISSED breakfast,"; fi
if [ "$LUNCH" = "false" ]; then MISSED="$MISSED lunch,"; fi
if [ "$DINNER" = "false" ]; then MISSED="$MISSED dinner"; fi

# Send reminder if meals were missed
if [ -n "$MISSED" ]; then
  MISSED=$(echo "$MISSED" | sed 's/,$//')
  MESSAGE="Good morning Bobby! You missed these meals yesterday: $MISSED. Don't forget to eat today!"
  
  # Send via OpenClaw/Telegram
  openclaw message send --channel telegram --to 8212808444 --message "$MESSAGE" 2>/dev/null || \
  echo "Would send: $MESSAGE"
fi
