export type LoaderType = "fabric" | "vanilla" | "forge" | "neoforge";
export interface ManifestFile { path: string; url: string; sha512: string; size?: number; }
export interface LauncherManifest {
  schemaVersion: 1; packVersion: string; name: string; summary?: string;
  minecraftVersion: string; javaMajor?: number;
  loader: { type: LoaderType; version?: string };
  server: { host?: string; port?: number };
  files: ManifestFile[];
  news?: Array<{ title: string; date?: string; body: string; tag?: string }>;
}
export interface LauncherSettings { memoryMb: number; gamePath: string; }
export interface BootstrapState {
  settings: LauncherSettings; manifest: LauncherManifest | null;
  manifestError: string | null; appVersion: string;
}
export interface LauncherProgress {
  phase: "checking" | "downloading" | "installing" | "launching" | "done" | "error";
  current: number; total: number; message: string;
}
export interface LauncherApi {
  getBootstrapState(): Promise<BootstrapState>;
  syncPack(): Promise<{ updated: number; removed: number; unchanged: number; total: number }>;
  prepareGame(): Promise<void>;
  openOfficialLauncher(): Promise<void>;
  saveSettings(settings: Partial<LauncherSettings>): Promise<LauncherSettings>;
  openExternal(url: string): Promise<void>;
  checkForUpdates(): Promise<void>;
  installUpdate(): Promise<void>;
  onProgress(callback: (value: LauncherProgress) => void): () => void;
  onUpdateStatus(callback: (value: string) => void): () => void;
}
