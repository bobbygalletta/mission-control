#!/usr/bin/env python3
"""
OpenClaw Self-Cleaning Maintenance Script
Archives old sessions, trajectory files, orphaned temp/deleted files,
trims gateway logs, manages MEMORY.md size, and prunes sessions.json.
"""

import os
import sys
import json
import shutil
import gzip
from datetime import datetime, timedelta
from pathlib import Path

HOME = Path.home()
OPENCLAW_DIR = HOME / ".openclaw"
AGENTS_DIR = OPENCLAW_DIR / "agents"
LOGS_DIR = OPENCLAW_DIR / "logs"
ARCHIVE_DIR = HOME / "agent-mission-control" / "data" / "openclaw-cleanup"
MEMORY_FILE = HOME / ".openclaw" / "workspace" / "MEMORY.md"

# Settings
MAX_SESSION_AGE_DAYS = 7        # Archive sessions older than this
MAX_TRAJECTORY_AGE_DAYS = 7    # Archive trajectory files older than this
MAX_MEMORY_SIZE = 12000         # bytes - trim MEMORY.md if larger
MAX_LOG_LINES = 1000            # Keep this many lines in gateway logs
MAX_SESSIONS_JSON_AGE_DAYS = 7  # Remove session entries older than this from sessions.json
SESSION_JSON_MAX_ENTRIES = 100   # Per-agent max sessions.json entries (prune to this)


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {msg}")


def ensure_archive():
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    dated_dir = ARCHIVE_DIR / datetime.now().strftime("%Y-%m-%d")
    dated_dir.mkdir(exist_ok=True)
    return dated_dir


def get_file_age_days(path):
    """Return age of file in days."""
    try:
        mtime = path.stat().st_mtime
        age = datetime.now() - datetime.fromtimestamp(mtime)
        return age.days
    except:
        return 0


def archive_file(src_path, archive_dir, label=""):
    """Archive a single file to the archive directory."""
    try:
        filename = src_path.name
        if label:
            filename = f"{label}_{filename}"
        dest = archive_dir / filename
        shutil.move(str(src_path), str(dest))
        size = dest.stat().st_size
        log(f"  Archived: {src_path.name} ({size / 1024:.1f} KB)")
        return size
    except Exception as e:
        log(f"  Error archiving {src_path.name}: {e}")
        return 0


def cleanup_agent_sessions(agent_id, archive_dir):
    """Clean up sessions for a single agent."""
    agent_dir = AGENTS_DIR / agent_id / "sessions"
    if not agent_dir.exists():
        return 0, 0

    archived_count = 0
    archived_bytes = 0

    # 1. Archive old trajectory files
    for f in agent_dir.glob("*.trajectory.jsonl"):
        if get_file_age_days(f) > MAX_TRAJECTORY_AGE_DAYS:
            archived_bytes += archive_file(f, archive_dir, f"{agent_id}_traj")
            archived_count += 1

    # 2. Archive old .jsonl session files (not trajectory)
    for f in agent_dir.glob("*.jsonl"):
        if ".trajectory" in f.name:
            continue
        if get_file_age_days(f) > MAX_SESSION_AGE_DAYS:
            archived_bytes += archive_file(f, archive_dir, f"{agent_id}_session")
            archived_count += 1

    # 3. Archive orphaned .tmp sessions.json backup files
    for f in agent_dir.glob("sessions.json.*.tmp"):
        archived_bytes += archive_file(f, archive_dir, f"{agent_id}_tmpsession")
        archived_count += 1

    # 4. Archive .deleted files (orphaned after compaction)
    for f in agent_dir.glob("*.deleted.*"):
        archived_bytes += archive_file(f, archive_dir, f"{agent_id}_deleted")
        archived_count += 1

    # 5. Archive .bak files
    for f in agent_dir.glob("*.bak*"):
        archived_bytes += archive_file(f, archive_dir, f"{agent_id}_bak")
        archived_count += 1

    # 6. Archive .reset files
    for f in agent_dir.glob("*.reset.*"):
        archived_bytes += archive_file(f, archive_dir, f"{agent_id}_reset")
        archived_count += 1

    return archived_count, archived_bytes


def prune_sessions_json(archive_dir):
    """Prune old entries from all sessions.json files."""
    total_pruned = 0
    total_archived_bytes = 0

    cutoff = datetime.now() - timedelta(days=MAX_SESSIONS_JSON_AGE_DAYS)

    for agent_dir in AGENTS_DIR.iterdir():
        if not agent_dir.is_dir():
            continue
        sessions_json = agent_dir / "sessions" / "sessions.json"
        if not sessions_json.exists():
            continue

        try:
            with open(sessions_json) as f:
                data = json.load(f)

            if not isinstance(data, dict):
                continue

            # Identify entries to prune
            prune_keys = []
            keep_data = {}
            archive_data = {}

            for key, val in data.items():
                # Always keep certain session types
                if key.startswith("agent:main:main"):
                    keep_data[key] = val
                    continue

                updated_at = val.get("updatedAt", 0)
                if updated_at:
                    if isinstance(updated_at, (int, float)):
                        entry_date = datetime.fromtimestamp(updated_at / 1000)
                    elif isinstance(updated_at, str):
                        try:
                            entry_date = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                        except:
                            prune_keys.append(key)
                            continue
                    else:
                        prune_keys.append(key)
                        continue

                    if entry_date < cutoff:
                        archive_data[key] = val
                    else:
                        keep_data[key] = val
                else:
                    # No updatedAt — archive it unless it's a current cron or active subagent
                    if any(key.startswith(prefix) for prefix in ["agent:main:main", "agent:main:cron", "agent:main:subagent"]):
                        keep_data[key] = val
                    else:
                        archive_data[key] = val

            # Enforce MAX per-agent limit — prune oldest by updatedAt
            if len(keep_data) > SESSION_JSON_MAX_ENTRIES:
                sortable = [(k, v.get("updatedAt", 0)) for k, v in keep_data.items()]
                sortable.sort(key=lambda x: x[1])
                excess = len(keep_data) - SESSION_JSON_MAX_ENTRIES
                for k, _ in sortable[:excess]:
                    archive_data[k] = keep_data.pop(k)

            if not archive_data:
                log(f"  {agent_dir.name}: sessions.json healthy ({len(keep_data)} entries)")
                continue

            # Archive old entries (gzip compressed)
            if archive_data:
                arch_name = f"sessions_json_{agent_dir.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json.gz"
                arch_path = archive_dir / arch_name
                with gzip.open(arch_path, 'wt', encoding='utf-8') as f:
                    json.dump(archive_data, f)
                arch_size = arch_path.stat().st_size
                log(f"  {agent_dir.name}: pruned {len(archive_data)} entries, archived ({arch_size / 1024:.1f} KB)")

            # Write pruned sessions.json
            with open(sessions_json, 'w') as f:
                json.dump(keep_data, f)

            new_size = sessions_json.stat().st_size
            log(f"  {agent_dir.name}: sessions.json → {new_size / 1024:.1f} KB ({len(keep_data)} entries)")

            total_pruned += len(archive_data)
            total_archived_bytes += arch_size

        except Exception as e:
            log(f"  Error processing {sessions_json}: {e}")

    return total_pruned, total_archived_bytes


def cleanup_sessions(archive_dir):
    """Clean up all agent sessions."""
    total_count = 0
    total_bytes = 0

    agents = [d.name for d in AGENTS_DIR.iterdir() if d.is_dir() and not d.name.startswith('.')]

    for agent in agents:
        count, bytes_ = cleanup_agent_sessions(agent, archive_dir)
        if count > 0:
            log(f"  {agent}: {count} files, {bytes_ / 1024:.1f} KB")
        total_count += count
        total_bytes += bytes_

    return total_count, total_bytes


def cleanup_logs(archive_dir):
    """Trim gateway logs."""
    total_bytes = 0
    total_count = 0

    log_files = [
        LOGS_DIR / "gateway.log",
        LOGS_DIR / "gateway.err.log",
    ]

    for lf in log_files:
        if not lf.exists():
            continue

        try:
            with open(lf) as f:
                lines = f.readlines()

            if len(lines) <= MAX_LOG_LINES:
                log(f"  {lf.name}: only {len(lines)} lines — skipping")
                continue

            # Keep last MAX_LOG_LINES lines
            kept = lines[-MAX_LOG_LINES:]

            # Archive the old content
            old_content = "".join(lines[:-MAX_LOG_LINES])
            if old_content.strip():
                log_name = f"{datetime.now().strftime('%Y%m%d_%H%M')}_{lf.name}"
                old_path = archive_dir / log_name
                with open(old_path, 'w') as f:
                    f.write(old_content)
                old_size = len(old_content)
                log(f"  Archived {len(lines) - MAX_LOG_LINES} old lines from {lf.name} ({old_size / 1024:.1f} KB)")

            # Write trimmed version
            with open(lf, 'w') as f:
                f.writelines(kept)

            log(f"  Trimmed {lf.name}: {len(lines)} → {len(kept)} lines")
            total_count += 1
            total_bytes += len(old_content)

        except Exception as e:
            log(f"  Error processing {lf.name}: {e}")

    return total_count, total_bytes


def cleanup_memory(archive_dir):
    """Ensure MEMORY.md doesn't exceed max size."""
    if not MEMORY_FILE.exists():
        return 0, 0

    size = MEMORY_FILE.stat().st_size
    if size <= MAX_MEMORY_SIZE:
        log(f"  MEMORY.md: {size} bytes — healthy")
        return 0, 0

    log(f"  MEMORY.md: {size} bytes — trimming to {MAX_MEMORY_SIZE}")

    with open(MEMORY_FILE) as f:
        content = f.read()

    # Archive current version first
    arch_name = f"MEMORY.md_archived_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    with open(archive_dir / arch_name, 'w') as f:
        f.write(content)

    # Keep essential sections, before the "Promoted From Short-Term Memory" marker
    lines = content.split('\n')
    kept_lines = []
    cutoff_found = False

    for line in lines:
        if '<!-- openclaw-memory-promotion:' in line or '## Promoted From Short-Term Memory' in line:
            cutoff_found = True
        if not cutoff_found:
            kept_lines.append(line)

    # If still too large, trim from end of kept section
    new_content = '\n'.join(kept_lines)
    new_size = len(new_content.encode('utf-8'))
    if new_size > MAX_MEMORY_SIZE:
        kept_lines = kept_lines[:int(len(kept_lines) * 0.8)]
        new_content = '\n'.join(kept_lines)

    with open(MEMORY_FILE, 'w') as f:
        f.write(new_content)

    trimmed_bytes = size - len(new_content.encode('utf-8'))
    log(f"  MEMORY.md trimmed: {size} → {len(new_content.encode('utf-8'))} bytes (saved {trimmed_bytes} bytes)")

    return trimmed_bytes, trimmed_bytes


def main():
    log("=== OpenClaw Self-Cleaning Maintenance ===")
    archive_dir = ensure_archive()
    log(f"Archive: {archive_dir}")

    total_files = 0
    total_bytes = 0

    # 1. Prune sessions.json
    log("\n[1/4] Pruning sessions.json entries...")
    pruned, bytes_ = prune_sessions_json(archive_dir)
    log(f"  Total: {pruned} entries pruned, {bytes_ / 1024:.1f} KB archived")
    total_bytes += bytes_

    # 2. Sessions cleanup
    log("\n[2/4] Cleaning up session files...")
    count, bytes_ = cleanup_sessions(archive_dir)
    log(f"  Total: {count} files, {bytes_ / 1024:.1f} KB archived")
    total_files += count
    total_bytes += bytes_

    # 3. Logs cleanup
    log("\n[3/4] Trimming gateway logs...")
    count, bytes_ = cleanup_logs(archive_dir)
    log(f"  Total: {count} log files trimmed, {bytes_ / 1024:.1f} KB archived")
    total_bytes += bytes_

    # 4. MEMORY.md cleanup
    log("\n[4/4] Checking MEMORY.md size...")
    trimmed, _ = cleanup_memory(archive_dir)
    if trimmed > 0:
        total_bytes += trimmed

    # Summary
    log(f"\n=== Done ===")
    log(f"Total: {total_files} files archived, {pruned} session entries pruned, {total_bytes / 1024:.1f} KB freed")
    log(f"Archive: {archive_dir}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
