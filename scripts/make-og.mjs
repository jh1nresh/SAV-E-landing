#!/usr/bin/env node
import { copyFileSync } from "node:fs";

// Keep the original public URL useful for previously shared links.
// New metadata points directly to the versioned Sakura artwork.
copyFileSync("public/assets/savvy-share-sakura.png", "public/og.png");
console.log("Updated public/og.png from the Sakura share artwork");
