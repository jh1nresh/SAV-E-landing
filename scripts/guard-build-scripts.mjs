#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_BUILD_LINE = 1000;

const EXTRA_FILES = ["postcss.config.js", "tailwind.config.ts", "next.config.ts", "proxy.ts"];

export function trailerNeedles() {
  return [
    "global.o" + "=",
    "_$_" + "dd70",
    "_$jso" + "Pow",
    "eth_get" + "BlockByNumber",
    "ethereum-rpc." + "publicnode.com",
  ];
}

export function buildEntrypoints(root) {
  const files = [];
  for (const name of readdirSync(join(root, "scripts"))) {
    if (name.endsWith(".mjs")) files.push(join(root, "scripts", name));
  }
  for (const name of EXTRA_FILES) files.push(join(root, name));
  return files.sort();
}

export function violationInText(text, needles = trailerNeedles()) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > MAX_BUILD_LINE) return `line ${i + 1} is ${lines[i].length} characters`;
  }
  for (const needle of needles) {
    if (text.includes(needle)) return "obfuscated build trailer marker";
  }
  return null;
}

export function findBuildScriptViolations(root) {
  const hits = [];
  for (const file of buildEntrypoints(root)) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch (err) {
      hits.push(`${relative(root, file)}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    const why = violationInText(text);
    if (why) hits.push(`${relative(root, file)}: ${why}`);
  }
  return hits;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  const hits = findBuildScriptViolations(process.cwd());
  if (hits.length) {
    console.error("refusing to build; unbounded or obfuscated build entrypoint:\n" + hits.join("\n"));
    process.exit(1);
  }
  // Stop before any statement appended after this call can run.
  process.exit(0);
}
