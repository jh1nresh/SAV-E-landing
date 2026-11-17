#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_RETRIES = 5;

export function parseBoundedArgs(argv) {
  let timeoutMs = null;
  let retries = 0;
  let label = "";
  const command = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      command.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "--timeout-ms") {
      timeoutMs = Number(argv[++i]);
      continue;
    }
    if (arg === "--retries") {
      retries = Number(argv[++i]);
      continue;
    }
    if (arg === "--label") {
      label = argv[++i];
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`unknown flag ${arg}`);
    command.push(...argv.slice(i));
    break;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("--timeout-ms must be a positive number");
  if (!Number.isInteger(retries) || retries < 0 || retries > MAX_RETRIES) {
    throw new Error(`--retries must be an integer from 0 to ${MAX_RETRIES}`);
  }
  if (command.length === 0) throw new Error("missing command");
  return { timeoutMs, retries, label: label || command[0], command: command[0], args: command.slice(1) };
}

function terminate(child) {
  if (child.pid == null) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    /* already gone, or not a process-group leader */
  }
  try {
    child.kill("SIGKILL");
  } catch {
    /* already gone */
  }
}

function runOnce({ command, args, timeoutMs, cwd, env, stdio }) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { cwd, env, stdio, detached: true });
    } catch (error) {
      resolve({ code: 1, signal: null, timedOut: false, pid: null, error });
      return;
    }
    let settled = false;
    let timedOut = false;
    let killWait = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killWait);
      resolve(result);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, timeoutMs);
    killWait = setTimeout(() => {
      finish({ code: null, signal: "SIGKILL", timedOut: true, pid: child.pid ?? null });
    }, timeoutMs + 1000);
    child.once("error", (error) => finish({ code: 1, signal: null, timedOut: false, pid: child.pid ?? null, error }));
    child.once("exit", (code, signal) => finish({
      code: code ?? (timedOut ? 124 : 1),
      signal,
      timedOut,
      pid: child.pid ?? null,
    }));
  });
}

export async function runBounded({ command, args = [], timeoutMs, retries = 0, cwd, env, stdio = "inherit", label = command }) {
  const attempts = retries + 1;
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.log(`bounded ${label}: attempt ${attempt}/${attempts}, timeout ${timeoutMs}ms`);
    const started = Date.now();
    last = await runOnce({ command, args, timeoutMs, cwd, env, stdio });
    const elapsed = Date.now() - started;
    if (!last.timedOut && last.code === 0) {
      console.log(`bounded ${label}: exit 0 in ${elapsed}ms`);
      return { ok: true, code: 0, attempt, timedOut: false, pid: last.pid, elapsedMs: elapsed };
    }
    if (!last.timedOut) {
      const code = last.code ?? 1;
      console.error(`bounded ${label}: exit ${code} in ${elapsed}ms`);
      return { ok: false, code, attempt, timedOut: false, pid: last.pid, elapsedMs: elapsed, error: last.error };
    }
    console.error(`bounded ${label}: timed out after ${elapsed}ms`);
    if (attempt === attempts) {
      console.error(`bounded ${label}: failed after ${attempts} attempt${attempts === 1 ? "" : "s"}`);
      return { ok: false, code: 124, attempt, timedOut: true, pid: last.pid, elapsedMs: elapsed };
    }
  }
  return { ok: false, code: 124, attempt: attempts, timedOut: true, pid: last?.pid ?? null, elapsedMs: 0 };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  try {
    const parsed = parseBoundedArgs(process.argv.slice(2));
    const result = await runBounded({ ...parsed, stdio: "inherit" });
    process.exit(result.code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
