import { app, BrowserWindow, ipcMain, safeStorage, shell, type WebContents } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { MinecraftFolder, Version, launch as launchMinecraft } from "@xmcl/core";
import { getVersionList, install, installDependencies, installFabric } from "@xmcl/installer";
import { MicrosoftAuthenticator } from "@xmcl/user";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AccountProfile, BootstrapState, LauncherManifest, LauncherProgress, LauncherSettings, ManifestFile } from "../shared/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETTINGS: LauncherSettings = { memoryMb: 6144, javaPath: "", gamePath: "" };
const MANAGED_ROOTS = new Set(["mods", "config", "resourcepacks", "shaderpacks", "defaultconfigs", "kubejs", "scripts"]);
const wait = (ms: number) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
interface AppConfig { microsoftClientId: string; manifestUrl: string; defaultGamePath?: string; }
interface SavedAccount { profile: AccountProfile; encryptedRefreshToken: string; }

let mainWindow: BrowserWindow | null = null;
let gameProcess: ChildProcess | null = null;
let pendingLogin = false;
let cachedManifest: LauncherManifest | null = null;
let cachedSettings = { ...DEFAULT_SETTINGS };
let config: AppConfig = { microsoftClientId: "", manifestUrl: "" };

const userData = () => app.getPath("userData");
const gamePath = () => cachedSettings.gamePath || config.defaultGamePath || join(app.getPath("appData"), ".kwadratowy-chaos", "instance");
const accountFile = () => join(userData(), "account.json");
const settingsFile = () => join(userData(), "settings.json");
const managedFile = () => join(gamePath(), ".kwadratowy-chaos", "managed-files.json");
const emit = (value: LauncherProgress) => mainWindow?.webContents.send("launcher:progress", value);
const sendAuth = (value: string) => mainWindow?.webContents.send("auth:status", value);
async function readAccount(): Promise<SavedAccount | null> {
  try { return JSON.parse(await readFile(accountFile(), "utf8")) as SavedAccount; } catch { return null; }
}
async function loadConfig() {
  const path = app.isPackaged ? join(process.resourcesPath, "launcher.json") : join(app.getAppPath(), "config", "launcher.json");
  try { config = JSON.parse(await readFile(path, "utf8")) as AppConfig; }
  catch { config = { microsoftClientId: "", manifestUrl: "" }; }
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
function findJava(): string {
  const candidates = [
    cachedSettings.javaPath,
    process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : "",
    ...(process.env.PATH || "").split(delimiter).map((folder) => join(folder, process.platform === "win32" ? "java.exe" : "java"))
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const result = spawnSync(candidate, ["-version"], { encoding: "utf8", windowsHide: true });
    if (!result.error && result.status === 0) return candidate;
  }
  throw new Error("Nie znaleziono Java. Zainstaluj wymaganą wersję albo wskaż java.exe w Ustawieniach.");
}
function verifyJava(path: string, requiredMajor: number) {
  const result = spawnSync(path, ["-version"], { encoding: "utf8", windowsHide: true });
  const output = (result.stderr || "") + (result.stdout || "");
  const match = output.match(/version "(\d+)/i);
  const major = match ? Number(match[1]) : 0;
  if (result.error || result.status !== 0 || major < requiredMajor) throw new Error("Ta paczka wymaga Java " + requiredMajor + " lub nowszej.");
}
async function oauthExchange(accessToken: string) {
  const auth = new MicrosoftAuthenticator();
  const tokens = await auth.acquireXBoxToken(accessToken);
  const claim = tokens.minecraftXstsResponse.DisplayClaims.xui[0];
  const minecraft = await auth.loginMinecraftWithXBox(claim.uhs, tokens.minecraftXstsResponse.Token);
  const response = await fetch("https://api.minecraftservices.com/minecraft/profile", { headers: { Authorization: "Bearer " + minecraft.access_token } });
  if (!response.ok) throw new Error("To konto Microsoft nie ma aktywnego profilu Minecraft Java Edition.");
  const profile = await response.json() as AccountProfile;
  return { profile, minecraftToken: minecraft.access_token };
}
async function saveAccount(profile: AccountProfile, refreshToken: string) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Szyfrowanie tokenów przez system Windows jest niedostępne.");
  const record: SavedAccount = { profile, encryptedRefreshToken: safeStorage.encryptString(refreshToken).toString("base64") };
  await mkdir(userData(), { recursive: true });
  await writeFile(accountFile(), JSON.stringify(record), "utf8");
  mainWindow?.webContents.send("auth:account", profile);
}
async function accessTokenForGame() {
  const saved = await readAccount();
  if (!saved) throw new Error("Najpierw zaloguj się na konto Microsoft.");
  const refreshToken = safeStorage.decryptString(Buffer.from(saved.encryptedRefreshToken, "base64"));
  const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.microsoftClientId, grant_type: "refresh_token", refresh_token: refreshToken, scope: "XboxLive.signin offline_access" })
  });
  const token = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !token.access_token) {
    await rm(accountFile(), { force: true });
    mainWindow?.webContents.send("auth:account", null);
    throw new Error("Sesja Microsoft wygasła. Zaloguj się ponownie.");
  }
  const result = await oauthExchange(token.access_token);
  await saveAccount(result.profile, token.refresh_token || refreshToken);
  return { accessToken: result.minecraftToken, profile: result.profile };
}
async function completeDeviceLogin(deviceCode: string) {
  const until = Date.now() + 15 * 60 * 1000;
  while (Date.now() < until) {
    await wait(5000);
    const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: config.microsoftClientId, device_code: deviceCode })
    });
    const data = await response.json() as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
    if (data.access_token && data.refresh_token) {
      sendAuth("Weryfikowanie konta Xbox i licencji Minecraft Java…");
      const result = await oauthExchange(data.access_token);
      await saveAccount(result.profile, data.refresh_token);
      sendAuth("Zalogowano jako " + result.profile.name + ".");
      return;
    }
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") { await wait(5000); continue; }
    if (data.error) throw new Error(data.error_description || data.error);
  }
  throw new Error("Kod logowania wygasł. Spróbuj ponownie.");
}
async function beginLogin() {
  if (pendingLogin) throw new Error("Logowanie Microsoft jest już w toku.");
  if (!config.microsoftClientId) throw new Error("Uzupełnij microsoftClientId w config/launcher.json i przebuduj aplikację.");
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Bezpieczny magazyn tokenów jest niedostępny.");
  pendingLogin = true;
  try {
    const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.microsoftClientId, scope: "XboxLive.signin offline_access" })
    });
    const data = await response.json() as { device_code?: string; user_code?: string; verification_uri?: string; message?: string; error?: string };
    if (!response.ok || !data.device_code || !data.user_code || !data.verification_uri) throw new Error(data.error || "Nie udało się rozpocząć logowania Microsoft.");
    void completeDeviceLogin(data.device_code)
      .catch((error: unknown) => sendAuth(error instanceof Error ? error.message : "Logowanie nie powiodło się."))
      .finally(() => { pendingLogin = false; });
    return { userCode: data.user_code, verificationUri: data.verification_uri, message: data.message || "Wpisz kod na stronie Microsoft." };
  } catch (error) { pendingLogin = false; throw error; }
}
async function installAndLaunch() {
  const manifest = cachedManifest || await fetchManifest();
  const { accessToken, profile } = await accessTokenForGame();
  const folder = gamePath();
  await mkdir(folder, { recursive: true });
  const javaPath = findJava();
  verifyJava(javaPath, manifest.javaMajor || 21);

  emit({ phase: "installing", current: 0, total: 3, message: "Instalowanie Minecrafta…" });
  const minecraft = MinecraftFolder.from(folder);
  const versions = await getVersionList();
  const vanilla = versions.versions.find((item) => item.id === manifest.minecraftVersion);
  if (!vanilla) throw new Error("Nie znaleziono Minecrafta " + manifest.minecraftVersion + ".");
  await install(vanilla, minecraft);

  let versionId = manifest.minecraftVersion;
  if (manifest.loader.type === "fabric") {
    if (!manifest.loader.version) throw new Error("Manifest nie określa wersji Fabric.");
    versionId = await installFabric({ minecraft, minecraftVersion: manifest.minecraftVersion, version: manifest.loader.version });
  } else if (manifest.loader.type !== "vanilla") {
    throw new Error("Loader " + manifest.loader.type + " wymaga jeszcze osobnego instalatora.");
  }
  emit({ phase: "installing", current: 2, total: 3, message: "Pobieranie bibliotek i assetów…" });
  const resolved = await Version.parse(folder, versionId);
  await installDependencies(resolved, {});
  emit({ phase: "launching", current: 3, total: 3, message: "Uruchamianie Minecrafta…" });
  const child = await launchMinecraft({
    gamePath: folder, javaPath, version: versionId,
    accessToken, gameProfile: { id: profile.id, name: profile.name },
    maxMemory: cachedSettings.memoryMb, minMemory: Math.min(2048, cachedSettings.memoryMb),
    launcherName: "Kwadratowy Chaos", launcherBrand: "Kwadratowy Chaos",
    server: manifest.server?.host ? { ip: manifest.server.host, port: manifest.server.port || 25565 } : undefined,
    extraExecOption: { detached: true, stdio: "ignore" }
  });
  gameProcess = child;
  mainWindow?.webContents.send("game:status", true);
  child.once("exit", () => { gameProcess = null; mainWindow?.webContents.send("game:status", false); });
  child.unref();
  emit({ phase: "done", current: 3, total: 3, message: "Minecraft został uruchomiony." });
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
    const account = await readAccount();
    let manifestError: string | null = null;
    try { await fetchManifest(); } catch (error) { manifestError = error instanceof Error ? error.message : "Błąd manifestu."; }
    return { account: account?.profile || null, settings: { ...cachedSettings, gamePath: gamePath() }, manifest: cachedManifest, manifestError, running: Boolean(gameProcess), appVersion: app.getVersion() };
  });
  ipcMain.handle("auth:begin", () => beginLogin());
  ipcMain.handle("auth:logout", async () => { await rm(accountFile(), { force: true }); mainWindow?.webContents.send("auth:account", null); });
  ipcMain.handle("pack:sync", (event) => syncPack(event.sender));
  ipcMain.handle("game:launch", async (event) => { await syncPack(event.sender); await installAndLaunch(); });
  ipcMain.handle("settings:save", async (_event, patch: Partial<LauncherSettings>) => {
    const memoryMb = Math.max(2048, Math.min(32768, Math.round(Number(patch.memoryMb ?? cachedSettings.memoryMb) / 512) * 512));
    const next = { ...cachedSettings, ...patch, memoryMb };
    if (next.javaPath && !isAbsolute(next.javaPath)) throw new Error("Ścieżka do Java musi być bezwzględna.");
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