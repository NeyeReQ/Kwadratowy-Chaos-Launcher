import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { LauncherApi } from "../shared/types";

const api: LauncherApi = {
  getBootstrapState: () => ipcRenderer.invoke("launcher:bootstrap"),
  getSystemMemory: () => ipcRenderer.invoke("system:memory"),
  syncPack: () => ipcRenderer.invoke("pack:sync"),
  prepareGame: () => ipcRenderer.invoke("game:prepare"),
  openOfficialLauncher: () => ipcRenderer.invoke("launcher:open-official"),
  saveSettings: (value) => ipcRenderer.invoke("settings:save", value),
  openExternal: (url) => ipcRenderer.invoke("shell:open", url),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onProgress: (callback) => listen("launcher:progress", callback),
  onUpdateStatus: (callback) => listen("updates:status", callback)
};
function listen<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
contextBridge.exposeInMainWorld("launcher", api);
