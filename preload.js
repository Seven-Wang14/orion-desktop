const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orion', {
  tool: (runId, name, args) => ipcRenderer.invoke('orion:tool', { runId, name, args }),
  abort: (runId) => ipcRenderer.invoke('orion:abort', { runId }),
  info: () => ipcRenderer.invoke('orion:info'),
  pickWork: () => ipcRenderer.invoke('orion:pickWork'),
  setWork: (dir) => ipcRenderer.invoke('orion:setWork', { dir }),
  win: (act) => ipcRenderer.send('orion:win', act),
  diffApply: (runId, act) => ipcRenderer.invoke('orion:diffApply', { runId, act }),
  undo: (seq) => ipcRenderer.invoke('orion:undo', { seq }),
  ttsCache: (key, data) => ipcRenderer.invoke('orion:ttsCache', { key, data }),
  onDiff: (cb) => ipcRenderer.on('orion:diff', (e, d) => cb(d)),
});
