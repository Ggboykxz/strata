#!/usr/bin/env python3
"""Heartbeat and lock-expiry probe for STRATA sessions (master §17, I15).

`docs/state/heartbeat.json` is generated state, gitignored, overwritten on every write — it is not an
event log, so no I15 violation. One file per event still applies to threads, journal and evidence.

Usage:
  heartbeat.py --write         overwrite heartbeat.json from the live repo state
  heartbeat.py --check-locks   exit 1 if any active lock has expired (watchdog fails closed)
  heartbeat.py --print         print the heartbeat without writing
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / "docs" / "state"
HEARTBEAT = STATE / "heartbeat.json"
LOCKS = STATE / "LOCKS.yaml"


def utcnow() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=True)
    return r.stdout.strip()


def session_id() -> str:
    text = (STATE / "SESSION.md").read_text(encoding="utf-8")
    m = re.search(r"`(\d{4}-\d{2}-\d{2}-s\d+)`", text)
    return m.group(1) if m else "unknown"


def task_id() -> str:
    text = (STATE / "NEXT_SESSION.md").read_text(encoding="utf-8")
    m = re.search(r"\| next task \| \*\*([A-Z0-9-]+)", text)
    return m.group(1) if m else "unknown"


def lock_state() -> tuple[list[str], list[str]]:
    doc = yaml.safe_load(LOCKS.read_text(encoding="utf-8")) or {}
    locks = doc.get("locks") or []
    now = dt.datetime.now(dt.timezone.utc)
    active: list[str] = []
    expired: list[str] = []
    for lock in locks:
        if lock.get("status") != "active":
            continue
        active.append(str(lock.get("path_glob", "unknown")))
        try:
            until = dt.datetime.fromisoformat(str(lock["expires_at"]).replace("Z", "+00:00"))
        except (KeyError, ValueError):
            expired.append(str(lock.get("path_glob", "unknown")))
            continue
        if until <= now:
            expired.append(str(lock.get("path_glob", "unknown")))
    return active, expired


def heartbeat() -> dict:
    active, _ = lock_state()
    return {
        "utc": utcnow(),
        "session": session_id(),
        "task": task_id(),
        "branch": git("branch", "--show-current"),
        "locks": active,
        "head": git("rev-parse", "--short", "HEAD"),
        "note": "generated state; gitignored; overwritten (I15)",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--write", action="store_true")
    g.add_argument("--check-locks", action="store_true")
    g.add_argument("--print", action="store_true")
    args = ap.parse_args()

    if args.check_locks:
        _, expired = lock_state()
        if expired:
            print("FAIL expired active lock(s): " + ", ".join(expired))
            print("Reclaim through the state/locks compare-and-swap protocol with a JOURNAL entry.")
            return 1
        print("OK 0 expired active locks")
        return 0

    data = heartbeat()
    if args.print:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        HEARTBEAT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {HEARTBEAT.relative_to(ROOT)} — {data['utc']} — {data['task']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
