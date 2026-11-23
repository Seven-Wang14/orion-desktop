const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orion', {
  tool: (runId, name, args) => ipcRenderer.invoke('orion:tool', { runId, name, args }),
  abort: (runId) => ipcRenderer.invoke('orion:abort', { runId }),
  info: () => ipcRenderer.invoke('orion:info'),
  pickWork: () => ipcRenderer.invoke('orion:pickWork'),
  setWork: (dir) => ipcRenderer.invoke('orion:setWork', { dir }),
});
