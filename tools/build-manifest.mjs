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
  if (fileName.includes("/") || !/\.zip$/i.test(fileName)) {
    throw new Error("Paczki tekstur muszą być archiwami ZIP bezpośrednio w pack/resourcepacks/: " + path);
  }
}
const availableResourcePackIds = new Set(resourcePackPaths
  .map((path) => "file/" + path.slice("resourcepacks/".length)));
const defaultResourcePackOrder = [
  "nclskins:mojang_collections",
  "continuity:glass_pane_culling_fix",
  "continuity:default",
  "file/Aimz - Tiny Crosshair.zip",
  "file/Fluid & Foolish 1.0.1.zip",
  "file/FA-All_Extensions-v1.10.1.zip",
  "file/FreshAnimations_v1.11.2_26.1.zip",
  "file/LowOnFire v26.1§8.zip",
  "file/BetterHotbar+ Default 1.2.zip",
  "file/Enchantment Glows v1.12.1.zip",
  "file/§aReimagined§0_§8[v1.63.7]§0.zip",
  "punchy:punchy",
  "file/Default-Dark-Mode-26.3-2026.9.0.zip",
  "black_icons",
  "vanilla",
  "serilum_mod_translations"
];
const configuredOrder = Array.isArray(manifest.resourcePackOrder) && manifest.resourcePackOrder.length
  ? manifest.resourcePackOrder
  : defaultResourcePackOrder;
const ordered = [];
const orderedSet = new Set();
for (const id of configuredOrder) {
  if (typeof id !== "string" || !id.trim() || id !== id.trim()) {
    throw new Error("Nieprawidłowy identyfikator paczki w resourcePackOrder.");
  }
  if (id.startsWith("file/")) {
    const fileName = id.slice("file/".length);
    if (!fileName || fileName.includes("/") || fileName.includes(String.fromCharCode(92)) || !/\.zip$/i.test(fileName)) {
      throw new Error("Nieprawidłowy identyfikator plikowej paczki ZIP: " + id);
    }
    if (!availableResourcePackIds.has(id)) {
      throw new Error("Paczka wskazana w resourcePackOrder nie istnieje w pack/resourcepacks/: " + id);
    }
  } else if (!/^[a-z0-9_.-]+(?::[a-z0-9_./-]+)?$/.test(id)) {
    throw new Error("Nieprawidłowy identyfikator wbudowanej paczki: " + id);
  }
  if (orderedSet.has(id)) throw new Error("Powtórzony identyfikator paczki w resourcePackOrder: " + id);
  ordered.push(id);
  orderedSet.add(id);
}
// Newly added ZIP packs are appended at the bottom of the UI priority list.
const newlyAdded = resourcePackPaths
  .map((path) => "file/" + path.slice("resourcepacks/".length))
  .filter((id) => !orderedSet.has(id))
  .sort((a, b) => a.localeCompare(b));
manifest.resourcePackOrder = [...ordered, ...newlyAdded];
manifest.packVersion = process.env.PACK_VERSION || manifest.packVersion;
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Manifest zapisany: ${files.length} plikow. Release: ${releaseTag}`);
