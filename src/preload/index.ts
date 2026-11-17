import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { LauncherApi, LauncherProgress } from "../shared/types";

const api: LauncherApi = {
  getBootstrapState: () => ipcRenderer.invoke("launcher:bootstrap"),
  beginLogin: () => ipcRenderer.invoke("auth:begin"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  syncPack: () => ipcRenderer.invoke("pack:sync"),
  launchGame: () => ipcRenderer.invoke("game:launch"),
  saveSettings: (value) => ipcRenderer.invoke("settings:save", value),
  openExternal: (url) => ipcRenderer.invoke("shell:open", url),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onProgress: (callback) => listen("launcher:progress", callback),
  onAuthStatus: (callback) => listen("auth:status", callback),
  onAccountChanged: (callback) => listen("auth:account", callback),
  onGameStatus: (callback) => listen("game:status", callback),
  onUpdateStatus: (callback) => listen("updates:status", callback)
};
function listen<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
contextBridge.exposeInMainWorld("launcher", api);