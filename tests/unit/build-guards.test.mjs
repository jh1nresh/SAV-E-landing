import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findBuildScriptViolations, MAX_BUILD_LINE, violationInText } from "../../scripts/guard-build-scripts.mjs";
import { decideIgnore, isSkippablePath } from "../../scripts/ignore-build.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const node = process.execPath;
const guardScript = join(repoRoot, "scripts/guard-build-scripts.mjs");
const ignoreScript = join(repoRoot, "scripts/ignore-build.mjs");

test("current build entrypoints have no trailer and the guard process exits 0", () => {
  assert.deepEqual(findBuildScriptViolations(repoRoot), []);
  const result = spawnSync(node, [guardScript], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("guard rejects an overlong line and the known trailer marker", () => {
  assert.match(violationInText(`${"x".repeat(MAX_BUILD_LINE + 1)}\n`), /characters/);
  assert.equal(violationInText("export const answer = 1;\n"), null);
  assert.equal(violationInText(`export const marker = "global.o" + "=";\n`), null);
  assert.equal(violationInText("global.o" + "=1;\n"), "obfuscated build trailer marker");

  const root = mkdtempSync(join(tmpdir(), "guard-"));
  mkdirSync(join(root, "scripts"));
  writeFileSync(join(root, "scripts/clean.mjs"), "export const answer = 1;\n");
  for (const name of ["postcss.config.js", "tailwind.config.ts", "next.config.ts", "proxy.ts"]) {
    writeFileSync(join(root, name), "export const answer = 1;\n");
  }
  assert.deepEqual(findBuildScriptViolations(root), []);
  writeFileSync(join(root, "postcss.config.js"), `module.exports = {};\n${"x".repeat(MAX_BUILD_LINE + 5)}\n`);
  assert.match(findBuildScriptViolations(root).join("\n"), /postcss\.config\.js/);
  rmSync(root, { recursive: true, force: true });
});

test("ignore decision builds site and content changes, and skips docs, workflows, and the inbox branch", () => {
  assert.equal(isSkippablePath("docs/GTM-INBOX.md"), true);
  assert.equal(isSkippablePath("content/metro/daily/taipei/2026-11-07/web.json"), false);
  assert.equal(isSkippablePath("app/page.tsx"), false);
  assert.equal(isSkippablePath("scripts/make-og.mjs"), false);

  const content = "content/metro/daily/shanghai/2026-11-13/web.json";
  assert.equal(decideIgnore({ ref: "content/metro-inbox/shanghai", previousAvailable: true, paths: [content] }).action, "build");
  assert.equal(decideIgnore({ ref: "main", previousAvailable: true, paths: ["docs/SEARCH-GUIDES.md", "README.md"] }).action, "skip");
  assert.equal(decideIgnore({ ref: "cursor/example-5e95", previousAvailable: true, paths: [".github/workflows/ci.yml", "app/page.tsx"] }).action, "build");
  assert.equal(decideIgnore({ ref: "main", previousAvailable: true, paths: [] }).action, "skip");
  assert.equal(decideIgnore({ ref: "main", previousAvailable: false, paths: ["README.md"] }).action, "build");
  assert.equal(decideIgnore({ ref: "main", previousAvailable: true, paths: null }).action, "build");
  assert.equal(decideIgnore({ ref: "refs/heads/gtm/inbox", previousAvailable: true, paths: ["app/page.tsx", content] }).action, "skip");
  assert.equal(decideIgnore({ ref: "codex/example", previousAvailable: true, paths: ["tests/unit/bounded-build.test.mjs"] }).action, "build");
});

test("ignore command exit code skips a docs-only diff and builds an app diff", () => {
  const cwd = mkdtempSync(join(tmpdir(), "ignore-git-"));
  const git = (args) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(["init"]);
  git(["config", "user.email", "bounded-build@example.com"]);
  git(["config", "user.name", "bounded-build"]);
  git(["config", "commit.gpgsign", "false"]);
  writeFileSync(join(cwd, "README.md"), "readme\n");
  mkdirSync(join(cwd, "app"));
  writeFileSync(join(cwd, "app/page.tsx"), "export default function Page(){return null}\n");
  git(["add", "."]);
  git(["commit", "-m", "base"]);
  const base = git(["rev-parse", "HEAD"]);
  writeFileSync(join(cwd, "README.md"), "readme changed\n");
  git(["add", "."]);
  git(["commit", "-m", "docs"]);
  const docs = git(["rev-parse", "HEAD"]);
  writeFileSync(join(cwd, "app/page.tsx"), "export default function Page(){return \"x\"}\n");
  git(["add", "."]);
  git(["commit", "-m", "app"]);
  const app = git(["rev-parse", "HEAD"]);

  const run = (env) => spawnSync(node, [ignoreScript], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  const docsOnly = run({ VERCEL_GIT_PREVIOUS_SHA: base, VERCEL_GIT_COMMIT_SHA: docs, VERCEL_GIT_COMMIT_REF: "cursor/docs-5e95" });
  assert.equal(docsOnly.status, 0, docsOnly.stderr);
  assert.match(docsOnly.stderr, /skip/);
  const appChange = run({ VERCEL_GIT_PREVIOUS_SHA: docs, VERCEL_GIT_COMMIT_SHA: app, VERCEL_GIT_COMMIT_REF: "content/metro-day" });
  assert.equal(appChange.status, 1, appChange.stderr);
  assert.match(appChange.stderr, /build/);
  const inbox = run({ VERCEL_GIT_PREVIOUS_SHA: docs, VERCEL_GIT_COMMIT_SHA: app, VERCEL_GIT_COMMIT_REF: "gtm/inbox" });
  assert.equal(inbox.status, 0, inbox.stderr);
  const first = run({ VERCEL_GIT_COMMIT_REF: "main" });
  assert.equal(first.status, 1, first.stderr);
  rmSync(cwd, { recursive: true, force: true });
});
