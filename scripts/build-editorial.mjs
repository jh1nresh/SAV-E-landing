import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Bundle editorial records at build time so Pages and the Markdown proxy use
// the same public inventory, including on deployments without a source tree.
function records(folder, key, pattern) {
  const dir = join("content", folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => name.endsWith(".json")).sort().map(name => {
    const entry = JSON.parse(readFileSync(join(dir, name), "utf8"));
    if (!pattern.test(entry[key]) || name !== entry[key] + ".json") {
      throw new Error("Invalid editorial filename or identifier: " + name);
    }
    if (!entry.title || !entry.region || !entry.date || Number.isNaN(Date.parse(entry.date))) {
      throw new Error("Missing title, region or date in " + name);
    }
    if (folder === "threads") {
      if (entry.url !== "https://www.threads.com/@savvysave_/post/" + entry.code || !entry.text?.trim()) {
        throw new Error("Missing original Threads source or text in " + name);
      }
    } else {
      if (!entry.city || !entry.description || !entry.sections?.length) throw new Error("Incomplete guide: " + name);
      for (const section of entry.sections) {
        if (!section.heading || !section.paragraphs?.length) throw new Error("Empty section: " + name);
        for (const paragraph of section.paragraphs) {
          if (!paragraph.text || paragraph.links?.some(link => !link.label || new URL(link.href).protocol !== "https:")) {
            throw new Error("Invalid guide paragraph or link: " + name);
          }
        }
        if (section.table?.rows.some(row => row.length !== section.table.columns.length)) throw new Error("Uneven table: " + name);
      }
    }
    return entry;
  });
}

const library = {
  travel: records("travel", "slug", /^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  threads: records("threads", "code", /^[A-Za-z0-9_-]+$/),
};
const out = "lib/editorial.public.json";
const json = JSON.stringify(library) + "\n";
if (!existsSync(out) || readFileSync(out, "utf8") !== json) writeFileSync(out, json);
