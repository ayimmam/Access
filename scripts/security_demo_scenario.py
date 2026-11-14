"""Facilitator-only CLI for repeatable local session-recovery exercises."""

import argparse
import os
import time
from pathlib import Path
from urllib.parse import urlsplit

from access_api.security import configured_store


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scenario", choices=["warning", "expiry", "reauthentication"])
    parser.add_argument("--alias", required=True, help="Fictional alias created for this exercise")
    args = parser.parse_args()
    site = urlsplit(os.environ.get("ACCESS_SECURITY_ORIGIN", "http://127.0.0.1:8000"))
    if site.hostname not in {"localhost", "127.0.0.1"}:
        raise SystemExit("Run exercises on a local demonstration instance.")
    root = Path(__file__).resolve().parents[1]
    database = configured_store(root)
    if database is None:
        raise SystemExit("Create a fictional account using scripts/setup_security_demo.py first.")
    now = time.time()
    lookup = database.digest("alias:" + args.alias.strip().casefold())
    with database.connection() as db:
        account = db.execute("SELECT id FROM accounts WHERE lookup=?", (lookup,)).fetchone()
        if account is None:
            raise SystemExit("The fictional account could not be found.")
        if args.scenario == "warning":
            db.execute("UPDATE sessions SET expires=min(expires, ?) WHERE account_id=?", (now + 125, account[0]))
        elif args.scenario == "expiry":
            db.execute("UPDATE sessions SET expires=? WHERE account_id=?", (now - 1, account[0]))
        else:
            db.execute("UPDATE sessions SET authenticated=? WHERE account_id=?", (now - 301, account[0]))
    print("Exercise prepared. Select Check session in the privacy console to load the updated state.")


if __name__ == "__main__":
    main()
