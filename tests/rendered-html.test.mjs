import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sovereign landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sovereign — Study with intent<\/title>/i);
  assert.match(html, /Your slides\./);
  assert.match(html, /One tutor that remembers\./);
  assert.match(html, /aria-label="Landing navigation"/);
  assert.match(html, /Add your first course/);
  assert.match(html, /Your model\. Your material\. Your machine\./);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("server-renders the Companion onboarding shell", async () => {
  const response = await render("/setup");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Checking whether Sovereign is already open/);
  assert.match(html, /Name your first course/);
});

test("keeps live tutoring, companion setup, and inspectable ingestion in source", async () => {
  const [
    workspace,
    setup,
    launcher,
    companion,
    preload,
    bridge,
    css,
    layout,
    packageJson,
    companionRelease,
  ] = await Promise.all([
    readFile(new URL("../app/tutor-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/setup-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../Start Sovereign.cmd", import.meta.url), "utf8"),
    readFile(new URL("../companion/main.mjs", import.meta.url), "utf8"),
    readFile(new URL("../companion/preload.cjs", import.meta.url), "utf8"),
    readFile(new URL("../bridge/server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/companion-release.ts", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /aria-pressed=\{focusMode\}/);
  assert.match(workspace, /End &amp; distil/);
  assert.match(workspace, /matchMedia\("\(max-width: 980px\)"\)/);
  assert.match(setup, /sovereign_bridge_token/);
  assert.match(setup, /Open Sovereign Companion/);
  assert.match(setup, /NEXT_PUBLIC_SOVEREIGN_COMPANION_DOWNLOAD_URL/);
  assert.match(setup, /Download for Windows/);
  assert.match(setup, /sovereign:\/\/open/);
  assert.match(setup, /window\.location\.hash/);
  assert.match(setup, /connectWithPairingCode/);
  assert.match(setup, /window\.setInterval/);
  assert.match(setup, /XMLHttpRequest/);
  assert.match(setup, /Source check/);
  assert.match(setup, /Visual preview/);
  assert.match(setup, /Drop your lecture slides here/);
  assert.match(launcher, /npm\.cmd run bridge/);
  assert.match(launcher, /codex login/);
  assert.match(companion, /new BrowserWindow/);
  assert.match(companion, /new Tray/);
  assert.match(companion, /setAsDefaultProtocolClient\("sovereign"/);
  assert.match(companion, /handoffUrl\.hash/);
  assert.match(companion, /checkForUpdates/);
  assert.match(companion, /companion:download-update/);
  assert.match(companionRelease, /public\.blob\.vercel-storage\.com/);
  assert.match(companionRelease, /version:\s*"0\.1\.3"/);
  assert.match(companion, /contextIsolation:\s*true/);
  assert.match(companion, /ELECTRON_RUN_AS_NODE/);
  assert.match(preload, /contextBridge\.exposeInMainWorld/);
  assert.match(bridge, /"--ephemeral"/);
  assert.match(bridge, /Sovereign Library/);
  assert.match(bridge, /retrieveEvidence/);
  assert.match(bridge, /extractPowerPointVisuals/);
  assert.match(bridge, /materialDetailMatch/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(layout, /x-forwarded-host/);
  assert.match(layout, /summary_large_image/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
