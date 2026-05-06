#!/bin/bash
# Memory Archive Wrapper — runs memory-archive.py for all agents
# Called by cron every 30 minutes

cd ~/agent-mission-control && python3 scripts/memory-archive.py --all >> ~/.openclaw/logs/memory-archive.log 2>&1
