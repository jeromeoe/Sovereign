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
import {
  isNewerVersion,
  parseReleaseManifest,
  RELEASE_MANIFEST_URL,
} from "./update-policy.mjs";

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
const legalUrl = new URL("/legal/notices", sovereignUrl).toString();
const libraryPath = path.join(app.getPath("home"), "Sovereign Library");
const statusFile = process.env.SOVEREIGN_COMPANION_STATUS_FILE ?? "";
const releaseManifestUrl =
  process.env.SOVEREIGN_RELEASE_MANIFEST_URL ?? RELEASE_MANIFEST_URL;
const updateCheckIntervalMs = 6 * 60 * 60 * 1000;
const maximumCommandOutputBytes = 1024 * 1024;

let mainWindow = null;
let tray = null;
let bridgeProcess = null;
let isQuitting = false;
let openBrowserWhenReady = true;
let updateCheck = null;
let updateTimer = null;
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
let updateState = {
  status: "checking",
  currentVersion: app.getVersion(),
  latestVersion: "",
  downloadUrl: "",
  message: "Checking quietly for updates.",
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  registerProtocolClient();
  app.on("second-instance", (_event, commandLine) => {
    if (commandLine.some((argument) => argument.startsWith("sovereign://"))) {
      void openSovereign();
      return;
    }
    showWindow();
  });
}

app.setAppUserModelId("com.sovereign.study");

function registerProtocolClient() {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient("sovereign", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }
  app.setAsDefaultProtocolClient("sovereign");
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  registerIpc();
  await Promise.all([startBridge(), checkCodexLogin(), checkForUpdates()]);
  updateTimer = setInterval(
    () => void checkForUpdates({ quiet: true }),
    updateCheckIntervalMs,
  );
  updateTimer.unref?.();
});

app.on("window-all-closed", () => {
  // Sovereign remains available from the Windows tray.
});

app.on("before-quit", () => {
  isQuitting = true;
  if (updateTimer) clearInterval(updateTimer);
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
      { label: "Open Sovereign", click: () => void openSovereign() },
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
    update: updateState,
  }));
  ipcMain.handle("companion:open-sovereign", openSovereign);
  ipcMain.handle("companion:open-library", () => shell.openPath(libraryPath));
  ipcMain.handle("companion:restart-bridge", restartBridge);
  ipcMain.handle("companion:sign-in", signInToCodex);
  ipcMain.handle("companion:check-updates", () => checkForUpdates());
  ipcMain.handle("companion:download-update", downloadUpdate);
  ipcMain.handle("companion:open-legal", () => shell.openExternal(legalUrl));
  ipcMain.handle("companion:hide", () => mainWindow?.hide());
}

async function checkForUpdates({ quiet = false } = {}) {
  if (updateCheck) return updateCheck;

  updateCheck = performUpdateCheck({ quiet }).finally(() => {
    updateCheck = null;
  });
  return updateCheck;
}

async function performUpdateCheck({ quiet }) {
  if (!quiet) {
    setUpdateState({
      ...updateState,
      status: "checking",
      message: "Checking quietly for updates.",
    });
  }

  try {
    const manifestUrl = new URL(releaseManifestUrl);
    manifestUrl.searchParams.set("check", Date.now().toString());
    const response = await fetch(manifestUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`Update service returned ${response.status}.`);
    }

    const source = await response.text();
    if (source.length > 64_000) {
      throw new Error("Update manifest is unexpectedly large.");
    }
    const release = parseReleaseManifest(JSON.parse(source));
    if (!release) throw new Error("Update manifest is invalid.");

    if (isNewerVersion(release.version, app.getVersion())) {
      setUpdateState({
        status: "available",
        currentVersion: app.getVersion(),
        latestVersion: release.version,
        downloadUrl: release.downloadUrl,
        message: `Version ${release.version} is ready to download.`,
      });
      return updateState;
    }

    setUpdateState({
      status: "current",
      currentVersion: app.getVersion(),
      latestVersion: release.version,
      downloadUrl: "",
      message: `Version ${app.getVersion()} is current.`,
    });
  } catch {
    if (!quiet || updateState.status === "checking") {
      setUpdateState({
        ...updateState,
        status: "unavailable",
        downloadUrl: "",
        message: "Couldn't check right now. Sovereign will keep working.",
      });
    }
  }
  return updateState;
}

async function downloadUpdate() {
  if (updateState.status !== "available" || !updateState.downloadUrl) {
    return { opened: false };
  }
  const downloadUrl = new URL(updateState.downloadUrl);
  if (downloadUrl.protocol !== "https:") return { opened: false };
  await shell.openExternal(downloadUrl.toString());
  return { opened: true };
}

async function openSovereign() {
  if (bridgeState.status !== "ready") {
    openBrowserWhenReady = true;
    showWindow();
    return;
  }

  openBrowserWhenReady = false;
  const handoffUrl = new URL(sovereignUrl);
  if (bridgeState.pairingCode) {
    handoffUrl.hash = new URLSearchParams({
      pair: bridgeState.pairingCode,
    }).toString();
  }
  await shell.openExternal(handoffUrl.toString());
}

async function startBridge() {
  const existing = await detectExistingBridge();
  if (existing) {
    if (!existing.pairingCode) {
      setBridgeState({
        status: "error",
        pairingCode: "",
        library: existing.library || libraryPath,
        message:
          "An older Sovereign connection is already using this computer. Quit it from the tray, then choose Restart connection.",
      });
      return;
    }
    setBridgeState({
      status: "ready",
      pairingCode: existing.pairingCode,
      library: existing.library || libraryPath,
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
    const health = await fetch("http://127.0.0.1:4317/v1/health", {
      signal: AbortSignal.timeout(800),
    });
    if (!health.ok) return null;

    const pairing = await fetch(
      "http://127.0.0.1:4317/v1/companion/pairing",
      {
        headers: { "X-Sovereign-Bridge": "companion" },
        signal: AbortSignal.timeout(800),
      },
    );
    if (!pairing.ok) return { pairingCode: "", library: libraryPath };
    const body = await pairing.json();
    return {
      pairingCode: /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(body.pairingCode ?? "")
        ? body.pairingCode
        : "",
      library: body.library || libraryPath,
    };
  } catch {
    return null;
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
  const result = await runCodexCommand(["login", "status"], {
    timeoutMs: 15_000,
  });
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
  const result = await runCodexCommand(["login"], { timeoutMs: 5 * 60 * 1000 });
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

function runCodexCommand(args, { timeoutMs = 30_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [codexCli, ...args], {
      cwd: runtimeDirectory,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let forcedError = "";
    const timeout = setTimeout(() => {
      forcedError = "Codex did not finish in time. You can safely try again.";
      child.kill();
    }, timeoutMs);
    timeout.unref?.();

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    }

    function appendOutput(current, chunk, stream) {
      const chunkBytes = Buffer.byteLength(chunk, "utf8");
      const nextBytes =
        stream === "stdout"
          ? (stdoutBytes += chunkBytes)
          : (stderrBytes += chunkBytes);
      if (nextBytes > maximumCommandOutputBytes) {
        forcedError = "Codex returned an unexpectedly large response.";
        child.kill();
        return current;
      }
      return current + chunk;
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk, "stdout");
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk, "stderr");
    });
    child.on("error", (error) =>
      finish({ code: 1, stdout, stderr: error.message }),
    );
    child.on("close", (code) =>
      finish({
        code: forcedError ? 1 : code,
        stdout,
        stderr: forcedError || stderr,
      }),
    );
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
  if (nextState.status === "ready" && openBrowserWhenReady) {
    void openSovereign();
  }
}

function setCodexState(nextState) {
  codexState = nextState;
  broadcastState();
}

function setUpdateState(nextState) {
  updateState = nextState;
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
    update: updateState,
  });
}

async function writeStatusFile() {
  try {
    await mkdir(path.dirname(statusFile), { recursive: true });
    await writeFile(
      statusFile,
      JSON.stringify(
        { bridge: bridgeState, codex: codexState, update: updateState },
        null,
        2,
      ),
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
