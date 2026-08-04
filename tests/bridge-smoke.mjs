import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const port = 4328;
const origin = `http://127.0.0.1:${port}`;
const dataDirectory = await mkdtemp(
  path.join(tmpdir(), "sovereign-bridge-smoke-"),
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
  const health = await fetch(`${origin}/v1/health`);
  assert.equal(health.status, 200);

  const pairing = await fetch(`${origin}/v1/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: pairingCode }),
  });
  assert.equal(pairing.status, 200);
  const { token } = await pairing.json();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const created = await fetch(`${origin}/v1/courses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: "TEST101",
      title: "Mechanism Testing",
    }),
  });
  assert.equal(created.status, 201);
  const { course } = await created.json();

  const form = new FormData();
  form.append(
    "files",
    new File(
      [
        "In a synchronous value-iteration sweep, every update must read from the fixed previous vector V_k. Reusing V_k+1 within the same sweep makes the result depend on state visitation order.",
      ],
      "mechanism-notes.txt",
      { type: "text/plain" },
    ),
  );
  const uploaded = await fetch(
    `${origin}/v1/courses/${course.id}/materials`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  assert.equal(uploaded.status, 201);
  const uploadedBody = await uploaded.json();
  const material = uploadedBody.materials[0];
  assert.ok(material.extractedCharacters > 0);

  const inspected = await fetch(
    `${origin}/v1/courses/${course.id}/materials/${material.id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(inspected.status, 200);
  const inspectedBody = await inspected.json();
  assert.match(inspectedBody.material.slides[0].text, /synchronous/i);

  const retainedFile = await fetch(
    `${origin}/v1/courses/${course.id}/materials/${material.id}/file`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(retainedFile.status, 200);
  assert.match(await retainedFile.text(), /value-iteration sweep/i);

  const tutoring = await fetch(`${origin}/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      courseId: course.id,
      sessionId: "smoke-session",
      message: "Why must the previous value vector stay fixed?",
    }),
  });
  const tutoringBody = await tutoring.json();
  assert.equal(tutoring.status, 200, tutoringBody.error);
  assert.match(tutoringBody.response, /V.?k|previous|fixed/i);
  assert.match(tutoringBody.response, /mechanism-notes\.txt/i);
  assert.ok(tutoringBody.sources.length >= 1);

  const distilled = await fetch(`${origin}/v1/distil`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId: "smoke-session" }),
  });
  const distilledBody = await distilled.json();
  assert.equal(distilled.status, 200, distilledBody.error);
  assert.equal(distilledBody.transcriptDeleted, true);
  assert.ok(distilledBody.evidence.durationSeconds >= 1);
  assert.ok(distilledBody.evidence.messageCount >= 2);

  const repeatedDistillation = await fetch(`${origin}/v1/distil`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId: "smoke-session" }),
  });
  assert.equal(repeatedDistillation.status, 404);

  const progress = await fetch(`${origin}/v1/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const progressBody = await progress.json();
  assert.equal(progress.status, 200);
  assert.equal(progressBody.totals.sessions, 1);
  assert.ok(progressBody.totals.durationSeconds >= 1);
  assert.equal(progressBody.courses[0].id, course.id);

  console.log(
    "Sovereign retained, tutored, distilled, deleted the transcript, and reported progress.",
  );
} finally {
  child.kill();
  await new Promise((resolve) => child.once("close", resolve));
  const resolved = path.resolve(dataDirectory);
  assert.ok(path.basename(resolved).startsWith("sovereign-bridge-smoke-"));
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
