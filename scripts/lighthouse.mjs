#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";

function waitPort(port) {
  return new Promise((resolve) => {
    const tryOnce = () => {
      const s = createServer();
      s.unref();
      s.on("error", () => resolve(false));
      s.listen(port, "127.0.0.1", () => {
        s.close(() => resolve(true));
      });
    };
    tryOnce();
  });
}

async function main() {
  const port = 4173;
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("next start timeout")), 30000);
    child.stdout.on("data", (buf) => {
      if (String(buf).includes("Ready") || String(buf).includes("started")) {
        clearTimeout(t);
        resolve(null);
      }
    });
    child.on("exit", (code) => reject(new Error(`next start exited ${code}`)));
  }).catch(async () => {
    for (let i = 0; i < 30; i++) {
      const free = await waitPort(port);
      if (!free) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  });

  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });
  const result = await lighthouse(`http://127.0.0.1:${port}/`, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
    onlyCategories: ["performance"],
  });
  await chrome.kill();
  child.kill();
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/lighthouse-mobile.json", result.report);
  const lhr = result.lhr;
  const lcp = lhr.audits["largest-contentful-paint"];
  const item = lhr.audits["largest-contentful-paint-element"];
  const summary = {
    lcpMs: lcp?.numericValue,
    lcpScore: lcp?.score,
    lcpElement: item?.details?.items?.[0]?.node?.snippet ?? item?.displayValue,
    perfScore: lhr.categories.performance?.score,
  };
  writeFileSync("reports/lighthouse-mobile-summary.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
