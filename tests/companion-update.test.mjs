import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersions,
  isNewerVersion,
  parseReleaseManifest,
} from "../companion/update-policy.mjs";

const validManifest = {
  schemaVersion: 1,
  version: "0.1.3",
  publishedAt: "2026-08-04T00:00:00.000Z",
  platform: "win32-x64",
  installer: {
    url: "https://downloads.example.com/Sovereign-Companion-Setup-0.1.3.exe",
    bytes: 212_000_000,
    sha256: "A".repeat(64),
    signature: "unsigned",
  },
  notes: ["A clearer update experience."],
};

test("compares stable Companion versions", () => {
  assert.equal(compareVersions("0.1.3", "0.1.2"), 1);
  assert.equal(compareVersions("0.1.3", "0.1.3"), 0);
  assert.equal(compareVersions("0.1.2", "0.1.3"), -1);
  assert.equal(isNewerVersion("1.0.0", "0.9.9"), true);
  assert.equal(isNewerVersion("not-a-version", "0.1.3"), false);
});

test("accepts a constrained HTTPS release manifest", () => {
  assert.deepEqual(parseReleaseManifest(validManifest), {
    version: "0.1.3",
    publishedAt: "2026-08-04T00:00:00.000Z",
    downloadUrl:
      "https://downloads.example.com/Sovereign-Companion-Setup-0.1.3.exe",
    bytes: 212_000_000,
    sha256: "A".repeat(64),
    signature: "unsigned",
    notes: ["A clearer update experience."],
  });
});

test("rejects unsafe or malformed release manifests", () => {
  assert.equal(
    parseReleaseManifest({
      ...validManifest,
      installer: { ...validManifest.installer, url: "http://example.com/a.exe" },
    }),
    null,
  );
  assert.equal(
    parseReleaseManifest({ ...validManifest, platform: "darwin-arm64" }),
    null,
  );
  assert.equal(
    parseReleaseManifest({
      ...validManifest,
      installer: { ...validManifest.installer, sha256: "short" },
    }),
    null,
  );
});
