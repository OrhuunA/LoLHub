import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    getAccounts: () => ipcRenderer.invoke('get-accounts'),
    saveAccount: (account: any) => ipcRenderer.invoke('save-account', account),
    deleteAccount: (id: string) => ipcRenderer.invoke('delete-account', id),
    lcuConnect: () => ipcRenderer.invoke('lcu-connect'),
    lcuRequest: (method: string, endpoint: string, body?: any) => ipcRenderer.invoke('lcu-request', method, endpoint, body),
    scrapeRank: (server: string, riotId: string) => ipcRenderer.invoke('scrape-rank', server, riotId),
    autoLogin: (path: string, user: string, pass: string) => ipcRenderer.invoke('auto-login', path, user, pass),
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    openConfig: () => ipcRenderer.invoke('open-config'),
    getChampions: () => ipcRenderer.invoke('get-champions'),
    refreshLCUStats: () => ipcRenderer.invoke('refresh-lcu-stats'),
    getAccountInventory: () => ipcRenderer.invoke('get-account-inventory'),
    getDDragonChampions: () => ipcRenderer.invoke('get-ddragon-champions'),
    backupGameConfig: () => ipcRenderer.invoke('backup-game-config'),
    restoreGameConfig: () => ipcRenderer.invoke('restore-game-config'),
    setChatPresence: (status: string) => ipcRenderer.invoke('set-chat-presence', status),
    getOfflineStatus: () => ipcRenderer.invoke('get-offline-status'),
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
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}
