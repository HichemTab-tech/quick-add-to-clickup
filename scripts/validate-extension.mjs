import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const packageMetadata = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must use Manifest V3.");
}

if (manifest.version !== packageMetadata.version) {
  throw new Error(
    `Version mismatch: manifest.json is ${manifest.version}, package.json is ${packageMetadata.version}.`,
  );
}

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.options_ui?.page,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);

for (const file of new Set(referencedFiles)) {
  await access(path.join(root, file));
}

const expectedPermissions = ["activeTab", "contextMenus", "notifications", "storage"];
for (const permission of expectedPermissions) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}

if (!manifest.host_permissions?.includes("https://api.clickup.com/*")) {
  throw new Error("The ClickUp API host permission is missing.");
}

console.log(`Validated Manifest V3 extension with ${new Set(referencedFiles).size} referenced files.`);
