import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = "pack";
const output = "launcher/manifest.json";
const repository = process.env.GITHUB_REPOSITORY || "NeyeReQ/Kwadratowy-Chaos-Launcher";
const manifest = JSON.parse(await readFile(output, "utf8"));
const releaseTag = process.env.PACK_RELEASE_TAG || `pack-v${process.env.PACK_VERSION || manifest.packVersion}`;
if (!/^[A-Za-z0-9._-]+$/.test(releaseTag)) {
  throw new Error("PACK_RELEASE_TAG moze zawierac tylko litery, cyfry, kropki, myslniki i podkreslenia.");
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error("Nieprawidlowa wartosc GITHUB_REPOSITORY.");
}
const allowed = new Set(["mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts"]);
const files = [];
const assetNames = new Set();

function githubAssetName(relativePath) {
  return relativePath.split("/").join("__").replace(/[^A-Za-z0-9._-]/g, "_");
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
    } else if (entry.isFile()) {
      const relativePath = relative(root, path).split(sep).join("/");
      if (!allowed.has(relativePath.split("/")[0])) continue;
      const assetName = githubAssetName(relativePath);
      if (assetNames.has(assetName.toLowerCase())) {
        throw new Error("Konflikt nazw assetow GitHub Release: " + assetName);
      }
      assetNames.add(assetName.toLowerCase());
      const bytes = await readFile(path);
      const url = `https://github.com/${repository}/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(assetName)}`;
      files.push({
        path: relativePath,
        url,
        sha512: createHash("sha512").update(bytes).digest("hex"),
        size: bytes.length
      });
    }
  }
}

await stat(root);
await walk(root);
manifest.files = files.sort((a, b) => a.path.localeCompare(b.path));

const resourcePackPaths = files
  .map((file) => file.path)
  .filter((path) => path.startsWith("resourcepacks/"));
for (const path of resourcePackPaths) {
  const fileName = path.slice("resourcepacks/".length);
  if (fileName.includes("/") || !/\\.zip$/i.test(fileName)) {
    throw new Error("Paczki tekstur muszą być archiwami ZIP bezpośrednio w pack/resourcepacks/: " + path);
  }
}
const availableResourcePacks = new Set(resourcePackPaths);
const configuredOrder = Array.isArray(manifest.resourcePackOrder) ? manifest.resourcePackOrder : [];
const ordered = [];
const orderedSet = new Set();
for (const path of configuredOrder) {
  if (availableResourcePacks.has(path) && !orderedSet.has(path)) {
    ordered.push(path);
    orderedSet.add(path);
  }
}
// New texture packs are added at the bottom of the priority list (alphabetically).
const newlyAdded = [...availableResourcePacks]
  .filter((path) => !orderedSet.has(path))
  .sort((a, b) => a.localeCompare(b));
manifest.resourcePackOrder = [...ordered, ...newlyAdded];
manifest.packVersion = process.env.PACK_VERSION || manifest.packVersion;
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Manifest zapisany: ${files.length} plikow. Release: ${releaseTag}`);
