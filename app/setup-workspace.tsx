"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  FileImage,
  FileText,
  FolderOpen,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Presentation,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { SovereignMark } from "./brand-mark";

const BRIDGE_URL = "http://127.0.0.1:4317";
const START_COMMAND = "npm run bridge";

type Material = {
  id: string;
  originalName: string;
  size: number;
  pages: number;
  chunks: number;
  kind: string;
};

type Course = {
  id: string;
  code: string;
  title: string;
  materials: Material[];
};

type BridgeState = "checking" | "offline" | "pairing" | "connected";

export function BridgeSetup() {
  const router = useRouter();
  const [bridgeState, setBridgeState] = useState<BridgeState>("checking");
  const [pairingCode, setPairingCode] = useState("");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [courseCode, setCourseCode] = useState("SC3000");
  const [courseTitle, setCourseTitle] = useState("Artificial Intelligence");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const checkBridge = useCallback(
    async (existingToken = "", silent = false) => {
      if (!silent) {
        setBridgeState("checking");
        setError("");
      }

      try {
        const health = await fetch(`${BRIDGE_URL}/v1/health`, {
          cache: "no-store",
        });
        if (!health.ok) throw new Error("Sovereign is unavailable.");

        if (existingToken) {
          const list = await fetch(`${BRIDGE_URL}/v1/courses`, {
            headers: { Authorization: `Bearer ${existingToken}` },
            cache: "no-store",
          });
          if (list.ok) {
            const data = await list.json();
            setCourses(data.courses ?? []);
            setActiveCourse(data.courses?.[0] ?? null);
            setBridgeState("connected");
            return;
          }
        }

        setBridgeState("pairing");
      } catch {
        setBridgeState("offline");
      }
    },
    [],
  );

  useEffect(() => {
    const savedToken =
      window.sessionStorage.getItem("sovereign_bridge_token") ?? "";
    setToken(savedToken);
    void checkBridge(savedToken);
  }, [checkBridge]);

  useEffect(() => {
    if (bridgeState !== "offline") return;
    const poll = window.setInterval(() => {
      void checkBridge(token, true);
    }, 2000);
    return () => window.clearInterval(poll);
  }, [bridgeState, checkBridge, token]);

  async function pairBridge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${BRIDGE_URL}/v1/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairingCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That code did not work.");

      setToken(data.token);
      window.sessionStorage.setItem("sovereign_bridge_token", data.token);
      const list = await fetch(`${BRIDGE_URL}/v1/courses`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const coursesData = await list.json();
      setCourses(coursesData.courses ?? []);
      setActiveCourse(coursesData.courses?.[0] ?? null);
      setBridgeState("connected");
    } catch (pairError) {
      setError(
        pairError instanceof Error ? pairError.message : "That code did not work.",
      );
    }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingCourse(true);
    setError("");
    try {
      const response = await bridgeFetch("/v1/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: courseCode, title: courseTitle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the course.");
      setCourses((current) => [...current, data.course]);
      setActiveCourse(data.course);
    } catch (courseError) {
      setError(
        courseError instanceof Error
          ? courseError.message
          : "Could not create the course.",
      );
    } finally {
      setCreatingCourse(false);
    }
  }

  async function uploadFiles(files: File[]) {
    if (!activeCourse || !files.length) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    try {
      const response = await bridgeFetch(
        `/v1/courses/${activeCourse.id}/materials`,
        { method: "POST", body: form },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      const nextCourse = {
        ...activeCourse,
        materials: [...activeCourse.materials, ...data.materials],
      };
      setActiveCourse(nextCourse);
      setCourses((current) =>
        current.map((course) =>
          course.id === nextCourse.id ? nextCourse : course,
        ),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function copyStartCommand() {
    try {
      await navigator.clipboard.writeText(START_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(`Copy failed. Run "${START_COMMAND}" in the Sovereign folder.`);
    }
  }

  function startTutor() {
    if (!activeCourse) return;
    window.sessionStorage.setItem("sovereign_course_id", activeCourse.id);
    router.push(`/tutor?course=${activeCourse.id}`);
  }

  function bridgeFetch(pathname: string, init?: RequestInit) {
    return fetch(`${BRIDGE_URL}${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  return (
    <main className="setup-shell">
      <header className="setup-header">
        <Link className="landing-brand" href="/">
          <SovereignMark size={36} />
          <span>Sovereign</span>
        </Link>
        <div className="setup-progress" aria-label="Setup progress">
          <span className={bridgeState === "connected" ? "done" : "active"}>
            <i>{bridgeState === "connected" ? <Check size={12} /> : "1"}</i>
            Start
          </span>
          <ChevronRight aria-hidden="true" size={14} />
          <span
            className={
              activeCourse
                ? "done"
                : bridgeState === "connected"
                  ? "active"
                  : ""
            }
          >
            <i>{activeCourse ? <Check size={12} /> : "2"}</i>
            Course
          </span>
          <ChevronRight aria-hidden="true" size={14} />
          <span
            className={
              activeCourse?.materials.length
                ? "done"
                : activeCourse
                  ? "active"
                  : ""
            }
          >
            <i>{activeCourse?.materials.length ? <Check size={12} /> : "3"}</i>
            Slides
          </span>
        </div>
        <Link className="setup-exit" href="/demo">
          View demo
        </Link>
      </header>

      <section className="setup-main" aria-live="polite">
        <div className="setup-intro">
          <Link className="setup-back" href="/">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to home
          </Link>
          <div className="setup-intro-copy">
            <p className="landing-kicker">Your first course</p>
            <h1>Ready to study in about three minutes.</h1>
            <p>
              Start Sovereign, name a course, and add the slides you already
              use. We’ll guide you one step at a time.
            </p>
          </div>
          <div className="setup-privacy-note">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>Your original files stay on this computer.</span>
          </div>
        </div>

        <article
          className={`setup-step setup-connect-step ${
            bridgeState === "connected" ? "complete" : "current"
          }`}
        >
          <div className="setup-step-heading">
            <span className="setup-step-icon">
              {bridgeState === "connected" ? (
                <Check size={18} />
              ) : (
                <SovereignMark size={22} />
              )}
            </span>
            <div>
              <p>First</p>
              <h2>
                {bridgeState === "pairing"
                  ? "Confirm this browser"
                  : bridgeState === "connected"
                    ? "Sovereign is ready"
                    : "Start Sovereign on this computer"}
              </h2>
            </div>
            {bridgeState === "connected" && (
              <span className="step-status">Ready</span>
            )}
          </div>

          {bridgeState === "checking" && (
            <div className="bridge-checking">
              <LoaderCircle className="spin" aria-hidden="true" size={18} />
              Checking whether Sovereign is already open…
            </div>
          )}

          {bridgeState === "offline" && (
            <div className="bridge-offline">
              <div className="bridge-waiting" role="status">
                <span className="bridge-waiting-pulse" aria-hidden="true" />
                <div>
                  <strong>Waiting for Sovereign</strong>
                  <span>This page will continue automatically when it opens.</span>
                </div>
              </div>

              <ol className="start-guide">
                <li>
                  <span>1</span>
                  <FolderOpen aria-hidden="true" size={20} />
                  <div>
                    <strong>Open your Sovereign folder</strong>
                    <p>The folder you downloaded or received from us.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div className="launcher-glyph" aria-hidden="true">
                    S
                  </div>
                  <div>
                    <strong>
                      Double-click <code>Start Sovereign.cmd</code>
                    </strong>
                    <p>A small window will open. Keep it open while you study.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <LockKeyhole aria-hidden="true" size={20} />
                  <div>
                    <strong>Come back here</strong>
                    <p>We’ll find it for you and ask for the code in that window.</p>
                  </div>
                </li>
              </ol>

              <div className="bridge-actions">
                <button
                  className="setup-secondary-button"
                  onClick={() => void checkBridge(token)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  Check again
                </button>
                <span>Usually detected within two seconds</span>
              </div>

              <details className="advanced-start">
                <summary>Prefer the terminal?</summary>
                <p>Run this inside the Sovereign folder:</p>
                <div className="command-copy">
                  <code>{START_COMMAND}</code>
                  <button
                    aria-label="Copy start command"
                    onClick={() => void copyStartCommand()}
                    type="button"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </details>
            </div>
          )}

          {bridgeState === "pairing" && (
            <form className="pairing-form" onSubmit={pairBridge}>
              <div className="pairing-copy">
                <LockKeyhole aria-hidden="true" size={20} />
                <div>
                  <strong>One quick safety check</strong>
                  <p>
                    Type the six-character code shown in the Sovereign window.
                    This connects only this browser.
                  </p>
                </div>
              </div>
              <label htmlFor="pairing-code">Code from the Sovereign window</label>
              <div className="pairing-control">
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  id="pairing-code"
                  inputMode="text"
                  maxLength={7}
                  onChange={(event) =>
                    setPairingCode(event.target.value.toUpperCase())
                  }
                  placeholder="ABC-123"
                  value={pairingCode}
                />
                <button disabled={pairingCode.length < 6} type="submit">
                  Continue
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
            </form>
          )}

          {bridgeState === "connected" && (
            <div className="bridge-connected">
              <div>
                <span className="connection-pulse" />
                <strong>Connected to your private study library</strong>
              </div>
              <span>Keep the Sovereign window open while you study.</span>
            </div>
          )}
        </article>

        <article
          className={`setup-step ${
            bridgeState !== "connected"
              ? "locked"
              : activeCourse
                ? "complete"
                : "current"
          }`}
        >
          <div className="setup-step-heading">
            <span className="setup-step-icon">
              {activeCourse ? <Check size={18} /> : <Plus size={18} />}
            </span>
            <div>
              <p>Next</p>
              <h2>Name your first course</h2>
            </div>
            {activeCourse && (
              <span className="step-status">{activeCourse.code}</span>
            )}
          </div>

          {bridgeState === "connected" && !activeCourse && (
            <form className="course-form" onSubmit={createCourse}>
              <label>
                <span>Course code</span>
                <input
                  autoFocus
                  maxLength={24}
                  onChange={(event) => setCourseCode(event.target.value)}
                  value={courseCode}
                />
              </label>
              <label>
                <span>Course name</span>
                <input
                  maxLength={120}
                  onChange={(event) => setCourseTitle(event.target.value)}
                  value={courseTitle}
                />
              </label>
              <button
                disabled={creatingCourse || !courseTitle.trim()}
                type="submit"
              >
                {creatingCourse ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
                Add course
              </button>
            </form>
          )}

          {activeCourse && (
            <div className="course-created">
              <div>
                <span>{activeCourse.code}</span>
                <strong>{activeCourse.title}</strong>
              </div>
              {courses.length > 1 && (
                <select
                  aria-label="Choose course"
                  onChange={(event) =>
                    setActiveCourse(
                      courses.find(
                        (course) => course.id === event.target.value,
                      ) ?? null,
                    )
                  }
                  value={activeCourse.id}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} · {course.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </article>

        <article
          className={`setup-step ${!activeCourse ? "locked" : "current"}`}
        >
          <div className="setup-step-heading">
            <span className="setup-step-icon">
              <UploadCloud size={18} />
            </span>
            <div>
              <p>Finally</p>
              <h2>Add the slides you want to study</h2>
            </div>
            {!!activeCourse?.materials.length && (
              <span className="step-status">
                {activeCourse.materials.length} ready
              </span>
            )}
          </div>

          {activeCourse && (
            <>
              <label
                className={`upload-zone ${dragActive ? "dragging" : ""}`}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  accept=".pdf,.pptx,.png,.jpg,.jpeg,.webp,.md,.txt"
                  multiple
                  onChange={handleFileInput}
                  type="file"
                />
                {uploading ? (
                  <LoaderCircle
                    className="spin"
                    aria-hidden="true"
                    size={27}
                  />
                ) : (
                  <UploadCloud aria-hidden="true" size={27} />
                )}
                <strong>
                  {uploading
                    ? "Getting your material ready…"
                    : "Drop your lecture slides here"}
                </strong>
                <span>
                  PDF, PowerPoint, images, Markdown, or text · up to 60 MB
                </span>
                {!uploading && <em>Choose files</em>}
              </label>

              {!!activeCourse.materials.length && (
                <div className="material-list">
                  {activeCourse.materials.map((material) => (
                    <div className="material-row" key={material.id}>
                      <span className="material-type">
                        {material.kind === "powerpoint" ? (
                          <Presentation size={18} />
                        ) : material.kind === "image" ? (
                          <FileImage size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </span>
                      <div>
                        <strong>{material.originalName}</strong>
                        <span>
                          {material.pages}{" "}
                          {material.pages === 1 ? "page" : "slides/pages"} ·{" "}
                          {formatBytes(material.size)}
                        </span>
                      </div>
                      <span className="indexed-state">
                        <Check size={13} />
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>

        {error && (
          <div className="setup-error" role="alert">
            <CircleAlert aria-hidden="true" size={18} />
            <span>{error}</span>
            <button
              aria-label="Dismiss error"
              onClick={() => setError("")}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="setup-finish">
          <p>
            {activeCourse?.materials.length
              ? "Everything is ready for your first source-grounded session."
              : "Add at least one source before starting the tutor."}
          </p>
          <button
            className="landing-primary"
            disabled={!activeCourse?.materials.length || uploading}
            onClick={startTutor}
            type="button"
          >
            Start tutoring
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
