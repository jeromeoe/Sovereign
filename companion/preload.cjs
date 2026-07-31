/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sovereignCompanion", {
  getState: () => ipcRenderer.invoke("companion:get-state"),
  openSovereign: () => ipcRenderer.invoke("companion:open-sovereign"),
  openLibrary: () => ipcRenderer.invoke("companion:open-library"),
  restartBridge: () => ipcRenderer.invoke("companion:restart-bridge"),
  signIn: () => ipcRenderer.invoke("companion:sign-in"),
  hide: () => ipcRenderer.invoke("companion:hide"),
  onState: (listener) => {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on("companion:state", handler);
    return () => ipcRenderer.removeListener("companion:state", handler);
  },
});
