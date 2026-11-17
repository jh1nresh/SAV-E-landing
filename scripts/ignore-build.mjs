#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_PREFIXES = ["docs/", "reports/", ".github/"];
const SKIP_EXACT = new Set(["AGENTS.md", "README.md"]);

export function isSkippablePath(path) {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  if (SKIP_EXACT.has(normalized)) return true;
  return SKIP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function decideIgnore({ ref, previousAvailable, paths }) {
  const branch = String(ref ?? "").replace(/^refs\/heads\//, "");
  if (branch === "gtm/inbox") return { action: "skip", reason: "gtm/inbox is not a site preview" };
  if (!previousAvailable) return { action: "build", reason: "no previous deployment" };
  if (paths === null) return { action: "build", reason: "diff unavailable" };
  const relevant = paths.filter((path) => !isSkippablePath(path));
  if (relevant.length === 0) {
    return { action: "skip", reason: paths.length === 0 ? "empty diff" : "no site files changed" };
  }
  return { action: "build", reason: relevant.slice(0, 5).join(", ") };
}

export function changedPaths(cwd, previous, head) {
  const diff = spawnSync("git", ["diff", "--name-only", previous, head], { cwd, encoding: "utf8" });
  if (diff.status !== 0) return null;
  return diff.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

function exitFor(decision) {
  console.error(`ignore-build: ${decision.action} (${decision.reason})`);
  return decision.action === "skip" ? 0 : 1;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  try {
    const previous = process.env.VERCEL_GIT_PREVIOUS_SHA || "";
    const head = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
    const previousAvailable = previous.length > 0;
    const paths = previousAvailable ? changedPaths(process.cwd(), previous, head) : null;
    process.exit(exitFor(decideIgnore({
      ref: process.env.VERCEL_GIT_COMMIT_REF,
      previousAvailable,
      paths: previousAvailable ? paths : null,
    })));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
