import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    downloadVideo: (options) => ipcRenderer.invoke('download-video', options),
    openFileFolder: (path) => ipcRenderer.invoke('open-file-folder', path),
    checkFileExists: (path) => ipcRenderer.invoke('check-file-exists', path),
    onProgress: (callback) => ipcRenderer.on('download-progress', (_, value) => callback(value)),
    removeProgressListeners: () => ipcRenderer.removeAllListeners('download-progress')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    window.electron = electronAPI
    window.api = api
}
