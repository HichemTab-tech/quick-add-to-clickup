import { access, readFile } from "node:fs/promises";
import path from "node:path";

const archiveArgument = process.argv[2];
const entryListArgument = process.argv[3];
if (!archiveArgument || !entryListArgument) {
  throw new Error("Pass the extension ZIP path and its entry-list file to validate.");
}

const archive = path.resolve(archiveArgument);
await access(archive);

const entries = (await readFile(path.resolve(entryListArgument), "utf8"))
  .trim()
  .split("\n")
  .filter((entry) => entry && !entry.endsWith("/"))
  .sort();

const expectedEntries = [
  "assets/icon-128.png",
  "assets/icon-16.png",
  "assets/icon-32.png",
  "assets/icon-48.png",
  "background.js",
  "lib/clickup.js",
  "lib/config.js",
  "lib/storage.js",
  "lib/templates.js",
  "manifest.json",
  "options.css",
  "options.html",
  "options.js",
].sort();

if (JSON.stringify(entries) !== JSON.stringify(expectedEntries)) {
  const missing = expectedEntries.filter((entry) => !entries.includes(entry));
  const unexpected = entries.filter((entry) => !expectedEntries.includes(entry));
  throw new Error(
    `Invalid extension package. Missing: ${missing.join(", ") || "none"}. ` +
      `Unexpected: ${unexpected.join(", ") || "none"}.`,
  );
}

console.log(`Validated ${path.basename(archive)} with ${entries.length} runtime files.`);
