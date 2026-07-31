"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  FileImage,
  FileText,
  HardDrive,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Presentation,
  RefreshCw,
  Terminal,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { SovereignMark } from "./brand-mark";

const BRIDGE_URL = "http://127.0.0.1:4317";

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
  const [error, setError] = useState("");

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem("sovereign_bridge_token") ?? "";
    setToken(savedToken);
    void checkBridge(savedToken);
  }, []);

  async function checkBridge(existingToken = token) {
    setBridgeState("checking");
    setError("");
    try {
      const health = await fetch(`${BRIDGE_URL}/v1/health`, {
        cache: "no-store",
      });
      if (!health.ok) throw new Error("Bridge unavailable.");
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
  }

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
      if (!response.ok) throw new Error(data.error ?? "Could not pair.");
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
        pairError instanceof Error ? pairError.message : "Could not pair the bridge.",
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
        current.map((course) => (course.id === nextCourse.id ? nextCourse : course)),
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
            Connect
          </span>
          <ChevronRight aria-hidden="true" size={14} />
          <span className={activeCourse ? "done" : bridgeState === "connected" ? "active" : ""}>
            <i>{activeCourse ? <Check size={12} /> : "2"}</i>
            Course
          </span>
          <ChevronRight aria-hidden="true" size={14} />
          <span className={activeCourse?.materials.length ? "done" : activeCourse ? "active" : ""}>
            <i>{activeCourse?.materials.length ? <Check size={12} /> : "3"}</i>
            Material
          </span>
        </div>
        <Link className="setup-exit" href="/demo">
          View demo
        </Link>
      </header>

      <div className="setup-layout">
        <aside className="setup-aside">
          <Link className="setup-back" href="/">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to home
          </Link>
          <p className="landing-kicker">First course</p>
          <h1>Give Sovereign something real to teach.</h1>
          <p>
            Connect the local bridge, name one course, then drop in the slides
            you already study from.
          </p>
          <div className="setup-promise">
            <HardDrive aria-hidden="true" size={19} />
            <div>
              <strong>Local by default</strong>
              <span>
                The original files and extracted learning index stay in your
                Sovereign Library folder.
              </span>
            </div>
          </div>
        </aside>

        <section className="setup-main" aria-live="polite">
          <article className={`setup-step ${bridgeState === "connected" ? "complete" : "current"}`}>
            <div className="setup-step-heading">
              <span className="setup-step-icon">
                {bridgeState === "connected" ? <Check size={18} /> : <Terminal size={18} />}
              </span>
              <div>
                <p>Step 1</p>
                <h2>Connect your Codex CLI</h2>
              </div>
              {bridgeState === "connected" && <span className="step-status">Connected</span>}
            </div>

            {bridgeState === "checking" && (
              <div className="bridge-checking">
                <LoaderCircle className="spin" aria-hidden="true" size={18} />
                Looking for Sovereign Bridge…
              </div>
            )}

            {bridgeState === "offline" && (
              <div className="bridge-offline">
                <p>
                  Open a terminal in the Sovereign project and start the local
                  bridge:
                </p>
                <code>
                  <span>$</span> npm run bridge
                </code>
                <p>
                  Keep that terminal open. It will show a pairing code and the
                  folder where your slides are retained.
                </p>
                <button className="setup-secondary-button" onClick={() => void checkBridge()} type="button">
                  <RefreshCw aria-hidden="true" size={16} />
                  I’ve started the bridge
                </button>
              </div>
            )}

            {bridgeState === "pairing" && (
              <form className="pairing-form" onSubmit={pairBridge}>
                <div className="pairing-copy">
                  <LockKeyhole aria-hidden="true" size={19} />
                  <p>
                    Enter the code shown in your bridge terminal. Pairing expires
                    when the bridge closes.
                  </p>
                </div>
                <label htmlFor="pairing-code">Pairing code</label>
                <div className="pairing-control">
                  <input
                    autoComplete="one-time-code"
                    id="pairing-code"
                    inputMode="text"
                    maxLength={7}
                    onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    value={pairingCode}
                  />
                  <button disabled={pairingCode.length < 6} type="submit">
                    Pair bridge
                    <Link2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </form>
            )}

            {bridgeState === "connected" && (
              <div className="bridge-connected">
                <div>
                  <span className="connection-pulse" />
                  <strong>Codex bridge ready</strong>
                </div>
                <span>Official CLI · local material storage · ephemeral tutoring turns</span>
              </div>
            )}
          </article>

          <article className={`setup-step ${bridgeState !== "connected" ? "locked" : activeCourse ? "complete" : "current"}`}>
            <div className="setup-step-heading">
              <span className="setup-step-icon">
                {activeCourse ? <Check size={18} /> : <Plus size={18} />}
              </span>
              <div>
                <p>Step 2</p>
                <h2>Create one course</h2>
              </div>
              {activeCourse && <span className="step-status">{activeCourse.code}</span>}
            </div>
            {bridgeState === "connected" && !activeCourse && (
              <form className="course-form" onSubmit={createCourse}>
                <label>
                  <span>Course code</span>
                  <input
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
                <button disabled={creatingCourse || !courseTitle.trim()} type="submit">
                  {creatingCourse ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
                  Create course
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
                      setActiveCourse(courses.find((course) => course.id === event.target.value) ?? null)
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

          <article className={`setup-step ${!activeCourse ? "locked" : "current"}`}>
            <div className="setup-step-heading">
              <span className="setup-step-icon">
                <UploadCloud size={18} />
              </span>
              <div>
                <p>Step 3</p>
                <h2>Upload the source material</h2>
              </div>
              {!!activeCourse?.materials.length && (
                <span className="step-status">
                  {activeCourse.materials.length} retained
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
                    <LoaderCircle className="spin" aria-hidden="true" size={27} />
                  ) : (
                    <UploadCloud aria-hidden="true" size={27} />
                  )}
                  <strong>{uploading ? "Extracting and indexing…" : "Drop your lecture slides here"}</strong>
                  <span>PDF, PowerPoint, PNG, JPG, WEBP, Markdown, or text · 60 MB per batch</span>
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
                            {material.pages} {material.pages === 1 ? "page" : "slides/pages"} ·{" "}
                            {formatBytes(material.size)}
                          </span>
                        </div>
                        <span className="indexed-state">
                          <Check size={13} />
                          Indexed
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
              <button aria-label="Dismiss error" onClick={() => setError("")} type="button">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="setup-finish">
            <p>
              {activeCourse?.materials.length
                ? "Your first source-grounded session is ready."
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
      </div>
    </main>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
