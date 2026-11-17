import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
const root = "pack";
const output = "launcher/manifest.json";
const base = process.env.PACK_CDN_BASE_URL;
if (!base || new URL(base).protocol !== "https:") throw new Error("Ustaw PACK_CDN_BASE_URL na publiczny adres HTTPS.");
const manifest = JSON.parse(await readFile(output, "utf8"));
const allowed = new Set(["mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts"]);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile()) {
      const relativePath = relative(root, path).split(sep).join("/");
      if (!allowed.has(relativePath.split("/")[0])) continue;
      const bytes = await readFile(path);
      const urlPath = relativePath.split("/").map(encodeURIComponent).join("/");
      files.push({ path: relativePath, url: new URL(urlPath, base.endsWith("/") ? base : base + "/").toString(), sha512: createHash("sha512").update(bytes).digest("hex"), size: bytes.length });
    }
  }
}
await stat(root);
await walk(root);
manifest.files = files.sort((a,b) => a.path.localeCompare(b.path));
manifest.packVersion = process.env.PACK_VERSION || manifest.packVersion;
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("Manifest zapisany: " + files.length + " plików.");
