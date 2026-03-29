#!/bin/bash
# Called at 3am to close out yesterday and start a new day
cd /Users/bobbygalletta/agent-mission-control

# Read current habits
DATA=$(cat data/habits.json 2>/dev/null)
TODAY=$(date "+%b %d, %Y")

# Check if today already has an entry
if echo "$DATA" | grep -q "\"date\":\"$TODAY\""; then
  echo "Today's entry already exists"
  exit 0
fi

# Create today's empty entry
TODAY_ENTRY="{\"date\":\"$TODAY\",\"water\":0,\"stretch\":0,\"laundry\":false,\"bedMade\":false,\"vacuum\":0,\"breakfast\":false,\"lunch\":false,\"dinner\":false}"

# Append to habits.json (simple approach)
echo "[$TODAY_ENTRY,$DATA" | sed 's/\[\[/\[/' > data/habits_new.json
mv data/habits.json data/habits_prev.json
mv data/habits_new.json data/habits.json

echo "New day started: $TODAY"
