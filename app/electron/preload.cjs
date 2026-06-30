const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", {
	isElectron: true,
	platform: process.platform
});
