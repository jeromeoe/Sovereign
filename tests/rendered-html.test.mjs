import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the Sovereign tutoring workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sovereign — Study with intent<\/title>/i);
  assert.match(html, /Hold the previous iteration still\./);
  assert.match(html, /Which value must remain fixed/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /aria-label="Evidence and session memory"/);
  assert.match(html, /Skip to tutoring/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("keeps responsive, accessible, and reduced-motion behavior in source", async () => {
  const [workspace, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/tutor-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /aria-pressed=\{focusMode\}/);
  assert.match(workspace, /End &amp; distil/);
  assert.match(workspace, /matchMedia\("\(max-width: 980px\)"\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(layout, /x-forwarded-host/);
  assert.match(layout, /summary_large_image/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
