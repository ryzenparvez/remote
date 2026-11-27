const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  newPassword: () => ipcRenderer.invoke('config:newPassword'),
  saveId: (id) => ipcRenderer.invoke('config:saveId', id),
  saveServer: (s) => ipcRenderer.invoke('config:saveServer', s),
  viewerMode: (on) => ipcRenderer.send('viewer', on),
  session: (active) => ipcRenderer.send('session', active),
  input: (ev) => ipcRenderer.send('input', ev),
});
