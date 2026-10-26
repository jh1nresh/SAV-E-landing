#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = ["本機互動原型", "10/25 預定", "INTERNAL_NOTE_MUST_NOT_SHIP"];
const GOOGLE_HOSTS = ["googleapis", "gstatic", "maps.google", "maps.googleapis"];
const GOOGLE_WORD = /google/i;
const root = process.cwd();

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function grepFiles(files, needles) {
  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const needle of needles) {
      if (text.includes(needle)) hits.push(`${file}: ${needle}`);
    }
  }
  return hits;
}

const sourceFiles = [
  ...walk(join(root, "app")),
  ...walk(join(root, "lib")),
  ...walk(join(root, "public")),
  join(root, "README.md"),
].filter((f) => !f.endsWith("metro.public.json") && !f.includes("Iansui"));

const sourceHits = grepFiles(sourceFiles, FORBIDDEN);
if (sourceHits.length) {
  console.error("forbidden strings in source:\n" + sourceHits.join("\n"));
  process.exit(1);
}

const hostHits = grepFiles(sourceFiles, GOOGLE_HOSTS);
if (hostHits.length) {
  console.error("maps/font hosts in source:\n" + hostHits.join("\n"));
  process.exit(1);
}

function grepWord(files, re) {
  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (re.test(text)) hits.push(file);
  }
  return hits;
}

const vendorSourceHits = grepWord(
  sourceFiles.filter((f) => !/\.(png|jpg|jpeg|webp|gif|ttf|woff2?|otf)$/i.test(f)),
  GOOGLE_WORD,
);
if (vendorSourceHits.length) {
  console.error("vendor name in source:\n" + vendorSourceHits.join("\n"));
  process.exit(1);
}

const nextDir = join(root, ".next");
if (existsSync(nextDir)) {
  const built = walk(nextDir).filter((f) => /\.(html|js|json|rsc|txt|css)$/.test(f));
  const builtHits = grepFiles(built, FORBIDDEN);
  if (builtHits.length) {
    console.error("forbidden strings in build output:\n" + builtHits.join("\n"));
    process.exit(1);
  }
  const privateKey = "not" + "es";
  const noteHits = [];
  for (const file of built) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes(`"${privateKey}"`) || text.includes(`'${privateKey}'`)) {
      noteHits.push(file);
    }
  }
  if (noteHits.length) {
    console.error("private field leaked into build output:\n" + noteHits.join("\n"));
    process.exit(1);
  }
  const pageBuilt = built.filter(
    (f) =>
      /\.(html|rsc)$/.test(f) ||
      /\/app[_/]/.test(f) ||
      /\/app\/metro\//.test(f),
  );
  const vendorBuilt = grepWord(pageBuilt, GOOGLE_WORD);
  if (vendorBuilt.length) {
    console.error("vendor name leaked into page build output:\n" + vendorBuilt.join("\n"));
    process.exit(1);
  }
}

try {
  const elephant = execSync("git grep -n 小象 -- app lib public README.md || true", {
    encoding: "utf8",
  });
  if (elephant.trim()) {
    console.error("elephant copy still referenced:\n" + elephant);
    process.exit(1);
  }
} catch {
  /* git grep returns 1 when no match */
}

console.log("check-forbidden: ok");
