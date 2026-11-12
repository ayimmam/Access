#!/usr/bin/env python3
"""Run dependency-free repository hygiene checks used by CI."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\((<[^>]*>|[^)]+)\)")
CONFLICT_MARKERS = ("<<<<<<< ", "=======", ">>>>>>> ")
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".sh",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
}
FORBIDDEN_SECRET_SUFFIXES = {".key", ".p12", ".pem", ".pfx"}


def repository_files() -> list[Path]:
    output = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout
    tracked = {ROOT / item.decode() for item in output.split(b"\0") if item}
    untracked_output = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout
    untracked = {
        ROOT / item.decode() for item in untracked_output.split(b"\0") if item
    }
    return sorted(tracked | untracked)


def check_forbidden_files(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        relative = path.relative_to(ROOT)
        if path.name.startswith(".env") and path.name != ".env.example":
            errors.append(f"forbidden tracked environment file: {relative}")
        if path.suffix.lower() in FORBIDDEN_SECRET_SUFFIXES:
            errors.append(f"forbidden tracked credential file: {relative}")
    return errors


def check_json(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() != ".json":
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")
    return errors


def check_markdown_links(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() != ".md":
            continue
        text = path.read_text(encoding="utf-8")
        for match in MARKDOWN_LINK.finditer(text):
            raw_target = match.group(1).strip("<>")
            file_target = unquote(raw_target.split("#", 1)[0])
            if not file_target or "://" in file_target or file_target.startswith("mailto:"):
                continue
            resolved = (path.parent / file_target).resolve()
            if not resolved.exists():
                line = text.count("\n", 0, match.start()) + 1
                errors.append(
                    f"broken local link in {path.relative_to(ROOT)}:{line}: {file_target}"
                )
    return errors


def check_conflict_markers(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), start=1):
            if any(line.startswith(marker) for marker in CONFLICT_MARKERS):
                errors.append(
                    f"merge-conflict marker in {path.relative_to(ROOT)}:{number}"
                )
    return errors


def main() -> int:
    files = repository_files()
    errors = [
        *check_forbidden_files(files),
        *check_json(files),
        *check_markdown_links(files),
        *check_conflict_markers(files),
    ]
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(
        f"Repository checks passed for {len(files)} repository files: "
        "local Markdown links, JSON, forbidden credential files, and conflict markers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
