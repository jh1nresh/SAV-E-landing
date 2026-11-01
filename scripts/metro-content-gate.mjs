import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export function contentOnly(files) {
  return files.length > 0 && files.every(path => path.startsWith('content/metro/') &&
    !path.includes('\0') && !path.split('/').some(part => part === '..' || part === '.' || !part));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = readFileSync(0, 'utf8').split('\0').filter(Boolean);
  const eligible = contentOnly(files);
  console.log(eligible ? 'All changed files are Metro content.' : 'Skipping auto-merge: empty diff or changes outside content/metro/. Human review required.');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `eligible=${eligible}\n`);
}
