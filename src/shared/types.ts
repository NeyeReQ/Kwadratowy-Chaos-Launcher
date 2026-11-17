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
export interface AccountProfile { id: string; name: string; }
export interface LauncherSettings { memoryMb: number; javaPath: string; gamePath: string; }
export interface BootstrapState {
  account: AccountProfile | null; settings: LauncherSettings; manifest: LauncherManifest | null;
  manifestError: string | null; running: boolean; appVersion: string;
}
export interface LauncherProgress {
  phase: "checking" | "downloading" | "installing" | "launching" | "done" | "error";
  current: number; total: number; message: string;
}
export interface LoginChallenge { userCode: string; verificationUri: string; message: string; }
export interface LauncherApi {
  getBootstrapState(): Promise<BootstrapState>;
  beginLogin(): Promise<LoginChallenge>;
  logout(): Promise<void>;
  syncPack(): Promise<{ updated: number; removed: number; unchanged: number; total: number }>;
  launchGame(): Promise<void>;
  saveSettings(settings: Partial<LauncherSettings>): Promise<LauncherSettings>;
  openExternal(url: string): Promise<void>;
  checkForUpdates(): Promise<void>;
  installUpdate(): Promise<void>;
  onProgress(callback: (value: LauncherProgress) => void): () => void;
  onAuthStatus(callback: (value: string) => void): () => void;
  onAccountChanged(callback: (value: AccountProfile | null) => void): () => void;
  onGameStatus(callback: (value: boolean) => void): () => void;
  onUpdateStatus(callback: (value: string) => void): () => void;
}