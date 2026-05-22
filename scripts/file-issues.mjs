#!/usr/bin/env node
// Parses docs/code-quality-issues.md and creates one GitHub issue per `## N. Title` section.
// Labels come from the `**Labels:**` line inside each section.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO = process.env.REPO || "faketut/WeAgree";
const DRY = process.env.DRY === "1";
const FILE = process.argv[2] || "docs/code-quality-issues.md";

const md = fs.readFileSync(FILE, "utf8");
// Split on top-level "## " headings, drop preamble (before first "## 1.")
const parts = md.split(/\n(?=## \d+\.\s)/g).filter((s) => /^## \d+\.\s/.test(s));

const tmpDir = fs.mkdtempSync("/tmp/wa-issues-");
const created = [];

for (const section of parts) {
  const lines = section.split("\n");
  const headingMatch = lines[0].match(/^## \d+\.\s+(.+?)\s*$/);
  if (!headingMatch) continue;
  const title = headingMatch[1].trim();

  // Body = everything after the heading line, trimmed; cut trailing "---" separator block if present.
  let body = lines.slice(1).join("\n").trim();
  body = body.replace(/\n+---\s*$/m, "").trim();

  // Extract labels
  const labelLine = body.match(/^\*\*Labels:\*\*\s*(.+)$/m);
  const labels = labelLine
    ? labelLine[1]
        .split(",")
        .map((s) => s.replace(/`/g, "").trim())
        .filter(Boolean)
    : [];

  const bodyFile = path.join(tmpDir, `${created.length + 1}.md`);
  fs.writeFileSync(bodyFile, body);

  const args = [
    "issue",
    "create",
    "-R",
    REPO,
    "-t",
    title,
    "-F",
    bodyFile,
  ];
  for (const l of labels) {
    args.push("-l", l);
  }

  if (DRY) {
    console.log(`[dry] gh ${args.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`);
    created.push({ title, labels, url: null });
    continue;
  }

  const res = spawnSync("gh", args, { encoding: "utf8" });
  const out = (res.stdout || "").trim();
  const err = (res.stderr || "").trim();
  if (res.status !== 0) {
    console.error(`FAIL: ${title}\n${err || out}`);
    continue;
  }
  const url = out.split("\n").pop();
  console.log(`OK  #${created.length + 1}: ${title} -> ${url}`);
  created.push({ title, labels, url });
}

console.log(`\nDone. ${created.filter((c) => c.url || DRY).length}/${parts.length} issues processed.`);
