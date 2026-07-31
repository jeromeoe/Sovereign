import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const companionDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = app.isPackaged
  ? app.getAppPath()
  : path.resolve(companionDirectory, "..");
const runtimeDirectory = app.isPackaged ? process.resourcesPath : appRoot;
const bridgeScript = path.join(appRoot, "bridge", "server.mjs");
const codexCli = path.join(
  appRoot,
  "node_modules",
  "@openai",
  "codex",
  "bin",
  "codex.js",
);
const sovereignUrl =
  process.env.SOVEREIGN_WEB_URL ??
  "https://sovereign-study-jerome.milky-grape-3300.chatgpt.site/setup";
const libraryPath = path.join(app.getPath("home"), "Sovereign Library");
const statusFile = process.env.SOVEREIGN_COMPANION_STATUS_FILE ?? "";

let mainWindow = null;
let tray = null;
let bridgeProcess = null;
let isQuitting = false;
let bridgeState = {
  status: "starting",
  pairingCode: "",
  library: libraryPath,
  message: "Preparing your private study connection…",
};
let codexState = {
  status: "checking",
  message: "Checking your ChatGPT connection…",
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
}

app.setAppUserModelId("com.sovereign.study");

app.whenReady().then(async () => {
  createWindow();
  createTray();
  registerIpc();
  await Promise.all([startBridge(), checkCodexLogin()]);
});

app.on("window-all-closed", () => {
  // Sovereign remains available from the Windows tray.
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBridge();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 470,
    height: 650,
    minWidth: 420,
    minHeight: 580,
    show: false,
    backgroundColor: "#faf7f0",
    title: "Sovereign Companion",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(companionDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(companionDirectory, "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
}

function createTray() {
  const icon = nativeImage
    .createFromPath(path.join(appRoot, "public", "favicon.svg"))
    .resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip("Sovereign Companion");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Companion", click: showWindow },
      { label: "Open Sovereign", click: () => void shell.openExternal(sovereignUrl) },
      { type: "separator" },
      { label: "Restart connection", click: () => void restartBridge() },
      { label: "Open study library", click: () => void shell.openPath(libraryPath) },
      { type: "separator" },
      {
        label: "Quit Sovereign Companion",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", showWindow);
}

function registerIpc() {
  ipcMain.handle("companion:get-state", () => ({
    bridge: bridgeState,
    codex: codexState,
  }));
  ipcMain.handle("companion:open-sovereign", () =>
    shell.openExternal(sovereignUrl),
  );
  ipcMain.handle("companion:open-library", () => shell.openPath(libraryPath));
  ipcMain.handle("companion:restart-bridge", restartBridge);
  ipcMain.handle("companion:sign-in", signInToCodex);
  ipcMain.handle("companion:hide", () => mainWindow?.hide());
}

async function startBridge() {
  const existing = await detectExistingBridge();
  if (existing) {
    setBridgeState({
      status: "ready",
      pairingCode: "",
      library: libraryPath,
      message: "Sovereign is already running on this computer.",
    });
    return;
  }

  setBridgeState({
    status: "starting",
    pairingCode: "",
    library: libraryPath,
    message: "Starting your private study connection…",
  });

  bridgeProcess = spawn(process.execPath, [bridgeScript], {
    cwd: runtimeDirectory,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      SOVEREIGN_COMPANION: "1",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  bridgeProcess.stdout.setEncoding("utf8");
  bridgeProcess.stderr.setEncoding("utf8");
  bridgeProcess.stdout.on("data", (chunk) => {
    stdout += chunk;
    const pairingCode = stdout.match(/Pairing code:\s*([A-Z0-9-]+)/)?.[1];
    const library = stdout.match(/Library:\s*(.+)/)?.[1]?.trim();
    if (pairingCode) {
      setBridgeState({
        status: "ready",
        pairingCode,
        library: library || libraryPath,
        message: "Sovereign is ready for your browser.",
      });
    }
  });
  bridgeProcess.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  bridgeProcess.on("error", (error) => {
    setBridgeState({
      status: "error",
      pairingCode: "",
      library: libraryPath,
      message: error.message,
    });
  });
  bridgeProcess.on("close", (code) => {
    bridgeProcess = null;
    if (isQuitting) return;
    if (bridgeState.status === "ready" && code === 0) {
      setBridgeState({
        status: "stopped",
        pairingCode: "",
        library: libraryPath,
        message: "The private study connection stopped.",
      });
      return;
    }
    setBridgeState({
      status: "error",
      pairingCode: "",
      library: libraryPath,
      message:
        friendlyBridgeError(stderr) ||
        `Sovereign stopped unexpectedly${code === null ? "." : ` (${code}).`}`,
    });
  });
}

async function detectExistingBridge() {
  try {
    const response = await fetch("http://127.0.0.1:4317/v1/health", {
      signal: AbortSignal.timeout(800),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function restartBridge() {
  stopBridge();
  await new Promise((resolve) => setTimeout(resolve, 250));
  await startBridge();
}

function stopBridge() {
  if (!bridgeProcess) return;
  bridgeProcess.kill();
  bridgeProcess = null;
}

async function checkCodexLogin() {
  setCodexState({
    status: "checking",
    message: "Checking your ChatGPT connection…",
  });
  const result = await runCodexCommand(["login", "status"]);
  if (result.code === 0 && /logged in/i.test(`${result.stdout}\n${result.stderr}`)) {
    setCodexState({
      status: "connected",
      message: "Connected with your ChatGPT account.",
    });
  } else {
    setCodexState({
      status: "signed-out",
      message: "Sign in once before your first tutoring session.",
    });
  }
}

async function signInToCodex() {
  setCodexState({
    status: "signing-in",
    message: "Finish signing in in the browser window that just opened.",
  });
  const result = await runCodexCommand(["login"]);
  if (result.code === 0) {
    await checkCodexLogin();
  } else {
    setCodexState({
      status: "error",
      message:
        result.stderr.trim() ||
        "Sign-in did not finish. You can safely try again.",
    });
  }
}

function runCodexCommand(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [codexCli, ...args], {
      cwd: runtimeDirectory,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) =>
      resolve({ code: 1, stdout, stderr: error.message }),
    );
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function friendlyBridgeError(stderr) {
  if (/address already in use|EADDRINUSE/i.test(stderr)) {
    return "Sovereign is already running. Open the study site and continue there.";
  }
  if (/cannot find module|module not found/i.test(stderr)) {
    return "The companion installation is incomplete. Reinstall Sovereign and try again.";
  }
  return stderr.trim().split(/\r?\n/).at(-1) ?? "";
}

function setBridgeState(nextState) {
  bridgeState = nextState;
  broadcastState();
}

function setCodexState(nextState) {
  codexState = nextState;
  broadcastState();
}

function broadcastState() {
  if (statusFile) {
    void writeStatusFile();
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("companion:state", {
    bridge: bridgeState,
    codex: codexState,
  });
}

async function writeStatusFile() {
  try {
    await mkdir(path.dirname(statusFile), { recursive: true });
    await writeFile(
      statusFile,
      JSON.stringify({ bridge: bridgeState, codex: codexState }, null, 2),
    );
  } catch {
    // Diagnostics must never interrupt the companion.
  }
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
