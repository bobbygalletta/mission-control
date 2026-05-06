#!/bin/bash
# Master Wiki Sync - Run this to sync ALL agents' conversations to the wiki
# Usage: ./wiki-sync-all.sh

AGENTS="main emmy finn rex x yoyos cody dj reese tt"

echo "=== Bobby's Wiki - Master Sync ==="
echo "Syncing all agents at $(date)"
echo ""

for agent in $AGENTS; do
    echo "Syncing $agent..."
    python3 ~/agent-mission-control/scripts/wiki-heartbeat.py $agent
done

echo ""
echo "=== Sync Complete ==="
echo "All conversations logged to ~/agent-mission-control/memory-wiki/daily-logs/"