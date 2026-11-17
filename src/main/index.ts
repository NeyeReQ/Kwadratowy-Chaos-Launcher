import { app, BrowserWindow, ipcMain, shell, type WebContents } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { MinecraftFolder, Version } from "@xmcl/core";
import { getVersionList, install, installDependencies, installFabric } from "@xmcl/installer";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { BootstrapState, LauncherManifest, LauncherProgress, LauncherSettings, ManifestFile } from "../shared/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETTINGS: LauncherSettings = { memoryMb: 6144, gamePath: "" };
const MANAGED_ROOTS = new Set(["mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts"]);
interface AppConfig { manifestUrl: string; defaultGamePath?: string; }

let mainWindow: BrowserWindow | null = null;
let cachedManifest: LauncherManifest | null = null;
let cachedSettings = { ...DEFAULT_SETTINGS };
let config: AppConfig = { manifestUrl: "" };

const userData = () => app.getPath("userData");
const gamePath = () => cachedSettings.gamePath || config.defaultGamePath || join(app.getPath("appData"), ".kwadratowy-chaos", "instance");
const settingsFile = () => join(userData(), "settings.json");
const minecraftRoot = () => join(app.getPath("appData"), ".minecraft");
const managedFile = () => join(gamePath(), ".kwadratowy-chaos", "managed-files.json");
const launcherProfilesFile = () => join(minecraftRoot(), "launcher_profiles.json");
const emit = (value: LauncherProgress) => mainWindow?.webContents.send("launcher:progress", value);
async function loadConfig() {
  const path = app.isPackaged ? join(process.resourcesPath, "launcher.json") : join(app.getAppPath(), "config", "launcher.json");
  try { config = JSON.parse(await readFile(path, "utf8")) as AppConfig; }
  catch { config = { manifestUrl: "" }; }
}
async function loadSettings() {
  try { cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(await readFile(settingsFile(), "utf8")) }; }
  catch { cachedSettings = { ...DEFAULT_SETTINGS }; }
}
function safePackPath(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.includes("\\") || isAbsolute(value)) throw new Error("Niebezpieczna ścieżka w manifeście paczki.");
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..") || !MANAGED_ROOTS.has(parts[0])) throw new Error("Ścieżka wychodzi poza dozwolone foldery paczki.");
  return value;
}
function resolvePackFile(value: string): string {
  const root = resolve(gamePath());
  const destination = resolve(root, ...safePackPath(value).split("/"));
  const rel = relative(root, destination);
  if (!rel || rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new Error("Ścieżka pliku wychodzi poza katalog gry.");
  return destination;
}
async function rejectSymlinkParents(destination: string) {
  const root = resolve(gamePath());
  const rel = relative(root, dirname(destination));
  let cursor = root;
  for (const part of rel.split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error("Wykryto dowiązanie symboliczne w folderze paczki."); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
}
function validateManifest(input: unknown): LauncherManifest {
  if (!input || typeof input !== "object") throw new Error("Manifest paczki ma nieprawidłowy format.");
  const m = input as Partial<LauncherManifest>;
  if (m.schemaVersion !== 1 || !m.minecraftVersion || !m.loader || !Array.isArray(m.files) || !m.name || !m.packVersion) {
    throw new Error("Manifest nie zawiera wymaganych pól.");
  }
  if (!["fabric", "vanilla", "forge", "neoforge"].includes(m.loader.type)) throw new Error("Nieobsługiwany loader.");
  const seen = new Set<string>();
  for (const file of m.files as ManifestFile[]) {
    safePackPath(file.path);
    if (seen.has(file.path.toLowerCase())) throw new Error("Manifest zawiera powtórzoną ścieżkę: " + file.path);
    seen.add(file.path.toLowerCase());
    if (!file.url || !/^[a-f0-9]{128}$/i.test(file.sha512 || "")) throw new Error("Nieprawidłowy adres lub SHA-512 pliku: " + file.path);
    if (new URL(file.url).protocol !== "https:") throw new Error("Pobieranie plików jest dozwolone wyłącznie przez HTTPS.");
  }
  return m as LauncherManifest;
}
async function fetchManifest(): Promise<LauncherManifest> {
  if (!config.manifestUrl) throw new Error("Brak manifestUrl w config/launcher.json.");
  const response = await fetch(config.manifestUrl, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Nie udało się pobrać manifestu (HTTP " + response.status + ").");
  cachedManifest = validateManifest(await response.json());
  return cachedManifest;
}
async function hashFile(path: string): Promise<string | null> {
  try { return createHash("sha512").update(await readFile(path)).digest("hex"); } catch { return null; }
}
async function downloadFile(file: ManifestFile) {
  const destination = resolvePackFile(file.path);
  await rejectSymlinkParents(destination);
  if (await hashFile(destination) === file.sha512.toLowerCase()) return false;
  const response = await fetch(file.url, { signal: AbortSignal.timeout(60000), redirect: "follow" });
  if (!response.ok || !response.url.startsWith("https://")) throw new Error("Nie udało się pobrać " + file.path + ".");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (file.size && bytes.byteLength !== file.size) throw new Error("Nieprawidłowy rozmiar pliku " + file.path + ".");
  if (createHash("sha512").update(bytes).digest("hex") !== file.sha512.toLowerCase()) throw new Error("Weryfikacja SHA-512 nie powiodła się: " + file.path);
  await mkdir(dirname(destination), { recursive: true });
  const temporary = destination + "." + randomUUID() + ".download";
  try { await writeFile(temporary, bytes, { flag: "wx" }); await rename(temporary, destination); }
  finally { await rm(temporary, { force: true }).catch(() => undefined); }
  return true;
}
async function previousManagedFiles(): Promise<string[]> {
  try {
    const data = JSON.parse(await readFile(managedFile(), "utf8")) as { files?: string[] };
    return Array.isArray(data.files) ? data.files : [];
  } catch { return []; }
}
async function syncPack(sender?: WebContents) {
  const manifest = await fetchManifest();
  const previous = await previousManagedFiles();
  const nextPaths = new Set(manifest.files.map((file) => file.path));
  let updated = 0, unchanged = 0, finished = 0;
  emit({ phase: "checking", current: 0, total: manifest.files.length, message: "Sprawdzanie wersji paczki…" });
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= manifest.files.length) return;
      const file = manifest.files[index];
      const changed = await downloadFile(file);
      if (changed) updated++; else unchanged++;
      finished++;
      const progress: LauncherProgress = {
        phase: "downloading", current: finished, total: manifest.files.length,
        message: (changed ? "Zaktualizowano " : "Sprawdzono ") + file.path
      };
      emit(progress); sender?.send("launcher:progress", progress);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, manifest.files.length) }, worker));
  // Remove only files present in the previous managed-file index, never arbitrary user files.
  let removed = 0;
  for (const oldPath of previous) {
    if (!nextPaths.has(oldPath)) { await rm(resolvePackFile(oldPath), { force: true }); removed++; }
  }
  await mkdir(dirname(managedFile()), { recursive: true });
  await writeFile(managedFile(), JSON.stringify({ packVersion: manifest.packVersion, files: [...nextPaths] }, null, 2), "utf8");
  emit({ phase: "done", current: manifest.files.length, total: manifest.files.length, message: "Paczka " + manifest.packVersion + " jest aktualna." });
  return { updated, removed, unchanged, total: manifest.files.length };
}
function assertOfficialLauncherClosed() {
  if (process.platform !== "win32") return;
  const checks = ["MinecraftLauncher.exe", "Minecraft.exe"];
  for (const image of checks) {
    const result = spawnSync("tasklist", ["/FI", "IMAGENAME eq " + image, "/FO", "CSV", "/NH"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (!result.error && (result.stdout || "").toLowerCase().includes(image.toLowerCase())) {
      throw new Error("Zamknij Minecraft Launcher i uruchomioną grę przed przygotowaniem lub aktualizacją paczki.");
    }
  }
}

async function registerOfficialLauncherProfile(versionId: string) {
  await mkdir(minecraftRoot(), { recursive: true });
  let launcherData: Record<string, unknown> = {};
  try {
    launcherData = JSON.parse(await readFile(launcherProfilesFile(), "utf8")) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error("Nie można odczytać launcher_profiles.json. Zamknij oficjalny Minecraft Launcher i spróbuj ponownie.");
    }
  }

  const profiles = (launcherData.profiles && typeof launcherData.profiles === "object" && !Array.isArray(launcherData.profiles))
    ? launcherData.profiles as Record<string, Record<string, unknown>>
    : {};
  const now = new Date().toISOString();
  const previous = profiles["kwadratowy-chaos"] || {};
  profiles["kwadratowy-chaos"] = {
    ...previous,
    created: typeof previous.created === "string" ? previous.created : now,
    gameDir: gamePath(),
    icon: typeof previous.icon === "string" ? previous.icon : "Grass",
    javaArgs: `-Xms2048M -Xmx${cachedSettings.memoryMb}M`,
    lastUsed: now,
    lastVersionId: versionId,
    name: "Kwadratowy Chaos",
    type: "custom"
  };
  launcherData.profiles = profiles;
  if (!launcherData.settings || typeof launcherData.settings !== "object" || Array.isArray(launcherData.settings)) {
    launcherData.settings = {};
  }
  if (typeof launcherData.version !== "number") launcherData.version = 3;

  const temporary = launcherProfilesFile() + ".kwadratowy-chaos.tmp";
  await writeFile(temporary, JSON.stringify(launcherData, null, 2), "utf8");
  await rename(temporary, launcherProfilesFile());
}

async function prepareGame() {
  assertOfficialLauncherClosed();
  const manifest = cachedManifest || await fetchManifest();
  if (manifest.loader.type !== "fabric" && manifest.loader.type !== "vanilla") {
    throw new Error("W tej wersji przygotowanie oficjalnego launchera obsługuje Fabric i Vanilla.");
  }

  emit({ phase: "installing", current: 0, total: 4, message: "Przygotowywanie Minecrafta " + manifest.minecraftVersion + "…" });
  const minecraft = MinecraftFolder.from(minecraftRoot());
  const versions = await getVersionList();
  const vanilla = versions.versions.find((item) => item.id === manifest.minecraftVersion);
  if (!vanilla) throw new Error("Nie znaleziono Minecrafta " + manifest.minecraftVersion + " w metadanych Mojang.");
  await install(vanilla, minecraft);

  let versionId = manifest.minecraftVersion;
  if (manifest.loader.type === "fabric") {
    if (!manifest.loader.version) throw new Error("Manifest nie określa wersji Fabric.");
    emit({ phase: "installing", current: 1, total: 4, message: "Instalowanie Fabric Loader " + manifest.loader.version + "…" });
    versionId = await installFabric({ minecraft, minecraftVersion: manifest.minecraftVersion, version: manifest.loader.version });
  }

  emit({ phase: "installing", current: 2, total: 4, message: "Pobieranie bibliotek i assetów gry…" });
  const resolved = await Version.parse(minecraftRoot(), versionId);
  await installDependencies(resolved, {});
  emit({ phase: "installing", current: 3, total: 4, message: "Dodawanie profilu Kwadratowy Chaos do oficjalnego launchera…" });
  await registerOfficialLauncherProfile(versionId);
  emit({ phase: "done", current: 4, total: 4, message: "Paczka i profil Kwadratowy Chaos są gotowe." });
}

async function openOfficialLauncher() {
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const candidates = [
      join(programFilesX86, "Minecraft Launcher", "MinecraftLauncher.exe"),
      join(programFiles, "Minecraft Launcher", "MinecraftLauncher.exe")
    ];
    const executable = candidates.find((candidate) => existsSync(candidate));
    if (executable) {
      const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
      return;
    }

    const storeLaunch = spawnSync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command",
      "$app = Get-StartApps | Where-Object { $_.Name -eq 'Minecraft Launcher' } | Select-Object -First 1; if ($app) { Start-Process ('shell:AppsFolder\\' + $app.AppID); exit 0 } else { exit 1 }"
    ], { encoding: "utf8", windowsHide: true });
    if (!storeLaunch.error && storeLaunch.status === 0) return;
  }

  await shell.openExternal("https://www.minecraft.net/download");
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1120, minHeight: 700,
    backgroundColor: "#090912", title: "Kwadratowy Chaos", autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, "../preload/index.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
}
function registerIpc() {
  ipcMain.handle("launcher:bootstrap", async (): Promise<BootstrapState> => {
    let manifestError: string | null = null;
    try { await fetchManifest(); } catch (error) { manifestError = error instanceof Error ? error.message : "Błąd manifestu."; }
    return { settings: { ...cachedSettings, gamePath: gamePath() }, manifest: cachedManifest, manifestError, appVersion: app.getVersion() };
  });
  ipcMain.handle("pack:sync", (event) => syncPack(event.sender));
  ipcMain.handle("game:prepare", async (event) => {
    await syncPack(event.sender);
    await prepareGame();
    await openOfficialLauncher();
  });
  ipcMain.handle("launcher:open-official", () => openOfficialLauncher());
  ipcMain.handle("settings:save", async (_event, patch: Partial<LauncherSettings>) => {
    const memoryMb = Math.max(2048, Math.min(32768, Math.round(Number(patch.memoryMb ?? cachedSettings.memoryMb) / 512) * 512));
    const next = { ...cachedSettings, ...patch, memoryMb };
    cachedSettings = next;
    await mkdir(userData(), { recursive: true });
    await writeFile(settingsFile(), JSON.stringify(cachedSettings, null, 2), "utf8");
    return { ...cachedSettings, gamePath: gamePath() };
  });
  ipcMain.handle("shell:open", async (_event, value: string) => {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("Można otwierać wyłącznie adresy HTTPS.");
    await shell.openExternal(url.toString());
  });
  ipcMain.handle("updates:check", async () => { if (app.isPackaged) await autoUpdater.checkForUpdates(); });
  ipcMain.handle("updates:install", () => autoUpdater.quitAndInstall());
}
app.whenReady().then(async () => {
  await loadConfig(); await loadSettings(); registerIpc(); createWindow();
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => mainWindow?.webContents.send("updates:status", "Sprawdzanie aktualizacji…"));
  autoUpdater.on("update-available", () => mainWindow?.webContents.send("updates:status", "Nowa wersja. Pobieranie…"));
  autoUpdater.on("update-not-available", () => mainWindow?.webContents.send("updates:status", "Launcher jest aktualny."));
  autoUpdater.on("update-downloaded", () => mainWindow?.webContents.send("updates:status", "Aktualizacja gotowa — kliknij, aby zainstalować."));
  autoUpdater.on("error", (error) => mainWindow?.webContents.send("updates:status", error.message));
  if (app.isPackaged) void autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });