import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOgPng, OG_HEIGHT, OG_WIDTH } from "../../scripts/make-og.mjs";
import { parseBoundedArgs, runBounded } from "../../scripts/run-bounded.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const node = process.execPath;

function pngSize(buf) {
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buf.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("og image is a fixed 1200x630 png and rejects an unbounded size", () => {
  const png = buildOgPng();
  assert.deepEqual(pngSize(png), { width: OG_WIDTH, height: OG_HEIGHT });
  assert.deepEqual(buildOgPng(), png);
  assert.throws(() => buildOgPng(2000, 2000), /out of bounds/);
  assert.throws(() => buildOgPng(0, 10), /out of bounds/);
});

test("make-og exits 0 and writes the png within the build budget", { timeout: 15_000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "og-"));
  const out = join(dir, "og.png");
  const started = Date.now();
  const result = spawnSync(node, ["scripts/make-og.mjs", out], { cwd: repoRoot, encoding: "utf8" });
  const elapsed = Date.now() - started;
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /make-og: start/);
  assert.deepEqual(pngSize(readFileSync(out)), { width: OG_WIDTH, height: OG_HEIGHT });
  assert.ok(elapsed < 5_000, `make-og took ${elapsed}ms`);
  rmSync(dir, { recursive: true, force: true });
});

test("bounded runner returns success, a fast error, a killed timeout, and a retry that recovers", { timeout: 20_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "bounded-"));
  const ok = join(dir, "ok.mjs");
  const fail = join(dir, "fail.mjs");
  const hang = join(dir, "hang.mjs");
  const flaky = join(dir, "flaky.mjs");
  const count = join(dir, "count.txt");
  writeFileSync(ok, "process.exit(0);\n");
  writeFileSync(fail, "process.exit(3);\n");
  writeFileSync(hang, "const until = Date.now() + 60_000; while (Date.now() < until) {}\n");
  writeFileSync(flaky, [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "const file = process.env.COUNT_FILE;",
    "const n = Number(readFileSync(file, 'utf8'));",
    "writeFileSync(file, String(n + 1));",
    "if (n === 0) { const until = Date.now() + 60_000; while (Date.now() < until) {} }",
    "process.exit(0);",
  ].join("\n"));
  writeFileSync(count, "0");

  const success = await runBounded({ command: node, args: [ok], timeoutMs: 5_000, stdio: "ignore", label: "ok" });
  assert.equal(success.ok, true);
  assert.equal(success.code, 0);
  assert.equal(success.attempt, 1);

  const errored = await runBounded({
    command: node, args: [fail], timeoutMs: 5_000, retries: 4, stdio: "ignore", label: "fail",
  });
  assert.equal(errored.ok, false);
  assert.equal(errored.timedOut, false);
  assert.equal(errored.code, 3);
  assert.equal(errored.attempt, 1);

  const started = Date.now();
  const timedOut = await runBounded({ command: node, args: [hang], timeoutMs: 400, stdio: "ignore", label: "hang" });
  const elapsed = Date.now() - started;
  assert.equal(timedOut.ok, false);
  assert.equal(timedOut.timedOut, true);
  assert.equal(timedOut.code, 124);
  assert.ok(elapsed < 3_000, `timeout path took ${elapsed}ms`);
  assert.throws(() => process.kill(timedOut.pid, 0));

  const recovered = await runBounded({
    command: node,
    args: [flaky],
    timeoutMs: 2_000,
    retries: 1,
    stdio: "ignore",
    label: "flaky",
    env: { ...process.env, COUNT_FILE: count },
  });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.attempt, 2);
  assert.equal(readFileSync(count, "utf8"), "2");

  assert.throws(() => parseBoundedArgs(["--timeout-ms", "0", "--", node]), /timeout-ms/);
  assert.throws(() => parseBoundedArgs(["--timeout-ms", "1000", "--retries", "9", "--", node]), /retries/);
  rmSync(dir, { recursive: true, force: true });
});

test("prebuild keeps a parent timeout and retries around og generation", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts.prebuild, /guard-build-scripts\.mjs/);
  assert.match(pkg.scripts.prebuild, /--timeout-ms 60000 --label build-metro/);
  assert.match(pkg.scripts.prebuild, /--timeout-ms 15000 --retries 2 --label make-og/);
  assert.match(pkg.scripts.build, /--timeout-ms 480000 --label next-build/);
  assert.match(pkg.scripts.build, /guard-build-scripts\.mjs/);
});
