#!/usr/bin/env python3
"""Parse docs/code-quality-issues.md and create GitHub issues with `gh`."""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = os.environ.get("REPO", "faketut/WeAgree")
DRY = os.environ.get("DRY") == "1"
FILE = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/code-quality-issues.md")

text = FILE.read_text()
# Split into sections beginning with "## N. Title"
sections = re.split(r"\n(?=## \d+\.\s)", text)
sections = [s for s in sections if re.match(r"^## \d+\.\s", s)]

tmpdir = Path(tempfile.mkdtemp(prefix="wa-issues-"))
ok = 0
fail = 0

for idx, sec in enumerate(sections, 1):
    lines = sec.split("\n")
    m = re.match(r"^## \d+\.\s+(.+?)\s*$", lines[0])
    if not m:
        continue
    title = m.group(1).strip()
    body = "\n".join(lines[1:]).strip()
    body = re.sub(r"\n+---\s*$", "", body).strip()

    lbl_m = re.search(r"^\*\*Labels:\*\*\s*(.+)$", body, re.M)
    labels = []
    if lbl_m:
        labels = [s.replace("`", "").strip() for s in lbl_m.group(1).split(",")]
        labels = [l for l in labels if l]

    body_file = tmpdir / f"{idx}.md"
    body_file.write_text(body)

    cmd = ["gh", "issue", "create", "-R", REPO, "-t", title, "-F", str(body_file)]
    for l in labels:
        cmd += ["-l", l]

    if DRY:
        print(f"[dry] {idx:>2}. {title}  labels={labels}")
        ok += 1
        continue

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"FAIL #{idx} {title}: {res.stderr.strip() or res.stdout.strip()}")
        fail += 1
        continue
    url = res.stdout.strip().splitlines()[-1]
    print(f"OK  #{idx:>2} {title} -> {url}")
    ok += 1

print(f"\n{ok} ok, {fail} failed, {len(sections)} total.")
