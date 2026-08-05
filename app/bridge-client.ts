"use client";

export const BRIDGE_URL = "http://127.0.0.1:4317";

const TOKEN_KEY = "sovereign_bridge_token";
const COURSE_KEY = "sovereign_course_id";

export function readBridgeToken() {
  return readPersistentValue(TOKEN_KEY);
}

export function writeBridgeToken(token: string) {
  writePersistentValue(TOKEN_KEY, token);
}

export function clearBridgeToken() {
  removePersistentValue(TOKEN_KEY);
}

export function readCourseId() {
  return readPersistentValue(COURSE_KEY);
}

export function writeCourseId(courseId: string) {
  writePersistentValue(COURSE_KEY, courseId);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController();
  const parentSignal = init.signal;
  let timedOut = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error(
        "Sovereign did not respond in time. Check the Companion and try again.",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

function readPersistentValue(key: string) {
  try {
    const persistent = window.localStorage.getItem(key);
    if (persistent) return persistent;

    const legacy = window.sessionStorage.getItem(key) ?? "";
    if (legacy) {
      window.localStorage.setItem(key, legacy);
      window.sessionStorage.removeItem(key);
    }
    return legacy;
  } catch {
    return "";
  }
}

function writePersistentValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    window.sessionStorage.removeItem(key);
  } catch {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in locked-down browser contexts.
    }
  }
}

function removePersistentValue(key: string) {
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    // There is nothing else to clear when browser storage is unavailable.
  }
}
