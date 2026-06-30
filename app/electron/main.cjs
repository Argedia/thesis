const { app, BrowserWindow, net, protocol, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const isDebug = process.env.ELECTRON_DEBUG === "1";
const appIconPath = path.join(__dirname, "..", "build", "icon.ico");

protocol.registerSchemesAsPrivileged([
	{
		scheme: "app",
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			stream: true
		}
	}
]);

function log(...args) {
	console.log("[electron]", ...args);
}

function registerAppProtocol() {
	protocol.handle("app", (request) => {
		const url = new URL(request.url);
		const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
		const filePath = path.normalize(path.join(__dirname, "..", "dist", relativePath));
		const distRoot = path.normalize(path.join(__dirname, "..", "dist"));

		if (!filePath.startsWith(distRoot)) {
			return new Response("Not found", { status: 404 });
		}

		if (!fs.existsSync(filePath)) {
			return new Response("Not found", { status: 404 });
		}

		return net.fetch(pathToFileURL(filePath).toString());
	});
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1440,
		height: 960,
		minWidth: 1100,
		minHeight: 720,
		icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
		log("did-fail-load", { errorCode, errorDescription, validatedURL });
	});

	win.webContents.on("render-process-gone", (_event, details) => {
		log("render-process-gone", details);
	});

	win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
		log("renderer-console", { level, message, line, sourceId });
	});

	if (isDev) {
		log("loading dev server", process.env.VITE_DEV_SERVER_URL);
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
		win.webContents.openDevTools({ mode: "detach" });
		return;
	}

	const indexPath = path.join(__dirname, "..", "dist", "index.html");
	if (!fs.existsSync(indexPath)) {
		throw new Error(`Desktop renderer build missing: ${indexPath}`);
	}
	log("loading app protocol", indexPath);
	win.loadURL("app://local/index.html");

	if (isDebug) {
		win.webContents.openDevTools({ mode: "detach" });
	}
}

app.whenReady().then(() => {
	log("app ready", { isDev, isDebug });
	if (process.platform === "win32") {
		app.setAppUserModelId("com.argedia.thesis");
	}
	if (!isDev) {
		registerAppProtocol();
	}
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
