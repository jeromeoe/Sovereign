import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";

const port = 4329;
const origin = `http://127.0.0.1:${port}`;
const dataDirectory = await mkdtemp(
  path.join(tmpdir(), "sovereign-ingestion-"),
);
const child = spawn(process.execPath, ["bridge/server.mjs"], {
  cwd: new URL("../", import.meta.url),
  env: {
    ...process.env,
    SOVEREIGN_BRIDGE_PORT: String(port),
    SOVEREIGN_DATA_DIR: dataDirectory,
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
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

try {
  const pairingCode = await waitForPairingCode();
  const pairing = await fetch(`${origin}/v1/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: pairingCode }),
  });
  assert.equal(pairing.status, 200);
  const { token } = await pairing.json();
  const authorization = { Authorization: `Bearer ${token}` };

  const created = await fetch(`${origin}/v1/courses`, {
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ code: "VIS101", title: "Visual Systems" }),
  });
  const { course } = await created.json();

  const deck = new JSZip();
  deck.file(
    "ppt/slides/slide1.xml",
    '<p:sld xmlns:p="p" xmlns:a="a"><a:t>Feedback loops create delayed system behaviour.</a:t></p:sld>',
  );
  deck.file(
    "ppt/slides/_rels/slide1.xml.rels",
    '<Relationships><Relationship Id="rId1" Target="../media/image1.png"/></Relationships>',
  );
  deck.file(
    "ppt/media/image1.png",
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );

  const form = new FormData();
  form.append(
    "files",
    new File([await deck.generateAsync({ type: "uint8array" })], "systems.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
  );
  const uploaded = await fetch(
    `${origin}/v1/courses/${course.id}/materials`,
    { method: "POST", headers: authorization, body: form },
  );
  assert.equal(uploaded.status, 201);
  const { materials } = await uploaded.json();
  assert.equal(materials[0].visuals, 1);
  assert.ok(materials[0].extractedCharacters > 0);

  const inspected = await fetch(
    `${origin}/v1/courses/${course.id}/materials/${materials[0].id}`,
    { headers: authorization },
  );
  assert.equal(inspected.status, 200);
  const { material } = await inspected.json();
  assert.equal(material.visuals, 1);
  assert.match(material.slides[0].text, /feedback loops/i);

  const visual = await fetch(
    `${origin}/v1/courses/${course.id}/materials/${materials[0].id}/visuals/0`,
    { headers: authorization },
  );
  assert.equal(visual.status, 200);
  assert.equal(visual.headers.get("content-type"), "image/png");
  assert.ok((await visual.arrayBuffer()).byteLength > 0);

  await writeFile(
    path.join(dataDirectory, "courses", course.id, "learning-profile.json"),
    JSON.stringify({
      entries: [
        {
          id: "test-session",
          distilledAt: new Date().toISOString(),
          reviewDueAt: new Date(Date.now() - 60_000).toISOString(),
          durationSeconds: 1500,
          messageCount: 6,
          confidenceDelta: 8,
          conceptsStudied: ["Feedback loops"],
          strengths: ["Identifies reinforcing loops"],
          misconceptions: ["Confuses delay with weak feedback"],
          nextRetrieval: ["Explain why delays produce oscillation"],
        },
      ],
    }),
  );
  const progressResponse = await fetch(`${origin}/v1/progress`, {
    headers: authorization,
  });
  assert.equal(progressResponse.status, 200);
  const progress = await progressResponse.json();
  assert.equal(progress.totals.sessions, 1);
  assert.equal(progress.totals.durationSeconds, 1500);
  assert.equal(progress.totals.currentStreak, 1);
  assert.equal(progress.totals.reviewsDue, 1);
  assert.equal(progress.courses[0].confidence, 58);
  assert.equal(progress.courses[0].misconceptions[0].count, 1);
  assert.equal(progress.courses[0].reviewDue, true);

  console.log(
    "Sovereign retained a slide visual and summarized local learning progress.",
  );
} finally {
  child.kill();
  await new Promise((resolve) => child.once("close", resolve));
  const resolved = path.resolve(dataDirectory);
  assert.ok(path.basename(resolved).startsWith("sovereign-ingestion-"));
  await rm(resolved, { recursive: true, force: true });
}

async function waitForPairingCode() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const match = stdout.match(/Pairing code:\s*([A-Z0-9-]+)/);
    if (match) return match[1];
    if (child.exitCode !== null) {
      throw new Error(`Bridge exited early.\n${stderr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for the bridge.\n${stdout}\n${stderr}`);
}
