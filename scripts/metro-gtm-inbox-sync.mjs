#!/usr/bin/env node
/**
 * Scan gtm/inbox packages and print a JSON plan for the workflow to execute.
 * Reads DESIGN + inbox from the filesystem; does not push by itself.
 *
 * Env/args:
 *   --repo-root .           trusted main checkout
 *   --inbox-root ./inbox    checkout of gtm/inbox (dated folders at root)
 *   --out plan.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  listInboxPackages, inspectPackage, planContentFiles, loadDesignIndex,
  buildIssueBody, issueTitle, contentPrBranch, contentPrTitle, contentPrBody,
} from './metro-gtm-inbox.mjs';

function argValue(argv, name, fallback = null) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  return argv[i + 1] ?? fallback;
}

const argv = process.argv.slice(2);
const repoRoot = resolve(argValue(argv, '--repo-root', '.'));
const inboxRoot = resolve(argValue(argv, '--inbox-root', 'inbox'));
const outPath = resolve(argValue(argv, '--out', 'inbox-sync-plan.json'));

const designByN = loadDesignIndex(repoRoot);
const packages = listInboxPackages(inboxRoot);
const plan = { generated_at: new Date().toISOString(), packages: [] };

for (const packageDir of packages) {
  let inspection;
  try {
    inspection = inspectPackage(packageDir, designByN);
  } catch (err) {
    plan.packages.push({
      packageDir,
      action: 'issue',
      reason: 'bad_data',
      message: err.message,
      issueTitle: `${issueTitle({ station_n: '?', station: basenameSafe(packageDir) })}`,
      issueBody: buildIssueBody({
        manifest: { date: basenameSafe(packageDir) },
        reason: 'bad_data',
        message: err.message,
        packageDir,
      }),
    });
    continue;
  }
  if (inspection.skip) {
    plan.packages.push({ packageDir, action: 'skip', reason: inspection.reason, message: inspection.message });
    continue;
  }
  if (!inspection.ok) {
    plan.packages.push({
      packageDir,
      action: 'issue',
      reason: inspection.reason,
      message: inspection.message,
      issueTitle: issueTitle(inspection.manifest),
      issueBody: buildIssueBody({ ...inspection, packageDir }),
      manifest: inspection.manifest,
    });
    continue;
  }
  const files = planContentFiles(inspection);
  plan.packages.push({
    packageDir,
    action: 'content_pr',
    deliveryKey: inspection.deliveryKey,
    contentHash: inspection.contentHash,
    branch: contentPrBranch(inspection.manifest),
    title: contentPrTitle(inspection.manifest),
    body: contentPrBody(inspection),
    files: files.map(f => ({ src: f.src, dest: f.dest })),
    manifest: inspection.manifest,
  });
}

function basenameSafe(p) {
  return String(p).split('/').filter(Boolean).at(-1) ?? p;
}

writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n');
console.log(`Wrote ${outPath} with ${plan.packages.length} package entr(y/ies)`);
for (const entry of plan.packages) {
  console.log(`- ${entry.action}: ${entry.packageDir}${entry.reason ? ` (${entry.reason})` : ''}`);
}
