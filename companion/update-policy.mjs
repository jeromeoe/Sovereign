export const RELEASE_MANIFEST_URL =
  "https://5qxl1upvecuha2vd.public.blob.vercel-storage.com/sovereign-companion/latest.json";

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const SHA256_PATTERN = /^[A-F0-9]{64}$/;

export function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  if (!leftParts || !rightParts) return 0;

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }
  return 0;
}

export function isNewerVersion(candidate, current) {
  return compareVersions(candidate, current) > 0;
}

export function parseReleaseManifest(value) {
  if (!value || typeof value !== "object") return null;
  if (value.schemaVersion !== 1 || value.platform !== "win32-x64") return null;
  if (!parseVersion(value.version)) return null;

  const installer = value.installer;
  if (!installer || typeof installer !== "object") return null;
  if (!Number.isSafeInteger(installer.bytes) || installer.bytes <= 0) return null;
  if (!SHA256_PATTERN.test(installer.sha256 ?? "")) return null;

  let installerUrl;
  try {
    installerUrl = new URL(installer.url);
  } catch {
    return null;
  }
  if (installerUrl.protocol !== "https:") return null;

  return {
    version: value.version,
    publishedAt:
      typeof value.publishedAt === "string" ? value.publishedAt : "",
    downloadUrl: installerUrl.toString(),
    bytes: installer.bytes,
    sha256: installer.sha256,
    signature: installer.signature === "signed" ? "signed" : "unsigned",
    notes: Array.isArray(value.notes)
      ? value.notes.filter((note) => typeof note === "string").slice(0, 5)
      : [],
  };
}

function parseVersion(version) {
  if (typeof version !== "string") return null;
  const match = version.match(VERSION_PATTERN);
  if (!match) return null;
  return match.slice(1).map(Number);
}
