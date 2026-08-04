"use client";

import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Presentation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
import { COMPANION_RELEASE } from "./companion-release";

const BRIDGE_URL = "http://127.0.0.1:4317";
const START_COMMAND = "npm run bridge";
const COMPANION_PROTOCOL_URL = "sovereign://open";
const COMPANION_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_SOVEREIGN_COMPANION_DOWNLOAD_URL?.trim() ||
  COMPANION_RELEASE.downloadUrl;

type Material = {
  id: string;
  originalName: string;
  size: number;
  pages: number;
  chunks: number;
  kind: string;
  extractedCharacters?: number;
  visuals?: number;
  warnings?: string[];
  preview?: string;
};

type MaterialSlide = {
  page: number;
  slide: number;
  text: string;
};

type MaterialDetail = Material & {
  slides: MaterialSlide[];
  warnings: string[];
  visuals: number;
  extractedCharacters: number;
};

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "waiting" | "uploading" | "processing" | "ready" | "error";
  error?: string;
};

type Course = {
  id: string;
  code: string;
  title: string;
  materials: Material[];
};

type BridgeState = "checking" | "offline" | "pairing" | "connected";
type InstallStage = "idle" | "downloading" | "opening";

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
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialDetail, setMaterialDetail] =
    useState<MaterialDetail | null>(null);
  const [materialPreviewUrl, setMaterialPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [installStage, setInstallStage] = useState<InstallStage>("idle");
  const [handoffCode, setHandoffCode] = useState("");
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

  const connectWithPairingCode = useCallback(async (code: string) => {
    setError("");
    try {
      const response = await fetch(`${BRIDGE_URL}/v1/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
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
        pairError instanceof Error
          ? pairError.message
          : "That code did not work.",
      );
    }
  }, []);

  useEffect(() => {
    const savedToken =
      window.sessionStorage.getItem("sovereign_bridge_token") ?? "";
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incomingCode = fragment.get("pair")?.trim().toUpperCase() ?? "";
    const bootstrap = window.setTimeout(() => {
      if (/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(incomingCode)) {
        setPairingCode(incomingCode);
        setHandoffCode(incomingCode);
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      setToken(savedToken);
      void checkBridge(savedToken);
    }, 0);
    return () => window.clearTimeout(bootstrap);
  }, [checkBridge]);

  useEffect(() => {
    if (bridgeState !== "offline") return;
    const poll = window.setInterval(() => {
      void checkBridge(token, true);
    }, 2000);
    return () => window.clearInterval(poll);
  }, [bridgeState, checkBridge, token]);

  useEffect(() => {
    if (bridgeState !== "pairing" || !handoffCode) return;
    const code = handoffCode;
    const pairing = window.setTimeout(() => {
      setHandoffCode("");
      void connectWithPairingCode(code);
    }, 0);
    return () => window.clearTimeout(pairing);
  }, [bridgeState, connectWithPairingCode, handoffCode]);

  useEffect(() => {
    return () => {
      if (materialPreviewUrl) URL.revokeObjectURL(materialPreviewUrl);
    };
  }, [materialPreviewUrl]);

  async function pairBridge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await connectWithPairingCode(pairingCode);
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
    const courseId = activeCourse.id;
    const queuedFiles = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      progress: 0,
      status: "waiting" as const,
      file,
    }));
    setUploading(true);
    setError("");
    setUploadQueue(
      queuedFiles.map(({ id, name, progress, status }) => ({
        id,
        name,
        progress,
        status,
      })),
    );

    try {
      for (const queuedFile of queuedFiles) {
        try {
          const material = await uploadOneFile(
            courseId,
            queuedFile.id,
            queuedFile.file,
          );
          setActiveCourse((current) =>
            current?.id === courseId
              ? { ...current, materials: [...current.materials, material] }
              : current,
          );
          setCourses((current) =>
            current.map((course) =>
              course.id === courseId
                ? { ...course, materials: [...course.materials, material] }
                : course,
            ),
          );
          updateUploadItem(queuedFile.id, {
            status: "ready",
            progress: 100,
          });
          await inspectMaterial(courseId, material);
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : "Upload failed.";
          updateUploadItem(queuedFile.id, {
            status: "error",
            error: message,
          });
        }
      }
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  }

  function uploadOneFile(courseId: string, queueId: string, file: File) {
    return new Promise<Material>((resolve, reject) => {
      const form = new FormData();
      form.append("files", file);
      const request = new XMLHttpRequest();
      request.open(
        "POST",
        `${BRIDGE_URL}/v1/courses/${courseId}/materials`,
      );
      request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.upload.addEventListener("loadstart", () => {
        updateUploadItem(queueId, { status: "uploading", progress: 4 });
      });
      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        updateUploadItem(queueId, {
          status: "uploading",
          progress: Math.max(4, Math.round((event.loaded / event.total) * 82)),
        });
      });
      request.upload.addEventListener("load", () => {
        updateUploadItem(queueId, { status: "processing", progress: 88 });
      });
      request.addEventListener("load", () => {
        let body;
        try {
          body = JSON.parse(request.responseText);
        } catch {
          return reject(new Error("Sovereign returned an unreadable response."));
        }
        if (request.status < 200 || request.status >= 300) {
          return reject(new Error(body.error ?? "Upload failed."));
        }
        const material = body.materials?.[0];
        if (!material) {
          return reject(new Error("The source was retained without an index."));
        }
        resolve(material);
      });
      request.addEventListener("error", () => {
        reject(new Error("The local study connection was interrupted."));
      });
      request.send(form);
    });
  }

  function updateUploadItem(id: string, patch: Partial<UploadItem>) {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function inspectMaterial(courseId: string, material: Material) {
    setSelectedMaterialId(material.id);
    setPreviewLoading(true);
    setPreviewPage(1);
    setMaterialDetail(null);
    try {
      const response = await bridgeFetch(
        `/v1/courses/${courseId}/materials/${material.id}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not inspect this source.");
      }
      setMaterialDetail(data.material);

      if (material.kind === "pdf" || material.kind === "image") {
        const fileResponse = await bridgeFetch(
          `/v1/courses/${courseId}/materials/${material.id}/file`,
          { cache: "no-store" },
        );
        if (!fileResponse.ok) throw new Error("Could not open the local preview.");
        const nextUrl = URL.createObjectURL(await fileResponse.blob());
        setMaterialPreviewUrl(nextUrl);
      } else {
        setMaterialPreviewUrl("");
      }
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Could not inspect this source.",
      );
    } finally {
      setPreviewLoading(false);
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

  function openCompanion() {
    setInstallStage("opening");
    window.location.assign(COMPANION_PROTOCOL_URL);
    window.setTimeout(() => void checkBridge(token, true), 1200);
    window.setTimeout(() => setInstallStage("idle"), 4500);
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
          id="companion"
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
                  <strong>
                    {installStage === "downloading"
                      ? "Your download has started"
                      : installStage === "opening"
                        ? "Trying to open Sovereign"
                        : "Sovereign isn’t open yet"}
                  </strong>
                  <span>
                    {installStage === "downloading"
                      ? "Open the installer when it finishes. This page will detect Sovereign automatically."
                      : installStage === "opening"
                        ? "If Windows asks for permission, choose Open Sovereign Companion."
                        : "Install it once, or open it if it is already on this computer."}
                  </span>
                </div>
              </div>

              <section className="companion-install" aria-labelledby="install-heading">
                <div className="companion-install-copy">
                  <span className="companion-install-mark">
                    <SovereignMark size={27} />
                  </span>
                  <div>
                    <h3 id="install-heading">Get Sovereign Companion</h3>
                    <p>
                      A one-time Windows companion keeps your study library private and
                      connects this page to your Codex account.
                    </p>
                  </div>
                </div>

                <div className="companion-install-actions">
                  <a
                    className="companion-download-button"
                    href={COMPANION_DOWNLOAD_URL}
                    onClick={() => setInstallStage("downloading")}
                  >
                    <Download aria-hidden="true" size={17} />
                    Download for Windows
                  </a>
                  <button
                    className="companion-open-button"
                    onClick={openCompanion}
                    type="button"
                  >
                    Already installed? Open Sovereign
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                </div>

                <p className="companion-install-meta">
                  {COMPANION_RELEASE.platform} · {COMPANION_RELEASE.size} · one-time setup
                </p>
              </section>

              <ol className="start-guide" aria-label="Installation steps">
                <li>
                  <span>1</span>
                  <Download aria-hidden="true" size={20} />
                  <div>
                    <strong>Download and run the installer</strong>
                    <p>It adds Sovereign to your desktop and Start menu.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <ShieldCheck aria-hidden="true" size={20} />
                  <div>
                    <strong>Let Sovereign finish starting</strong>
                    <p>Sign in to Codex if the Companion asks you to.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <LockKeyhole aria-hidden="true" size={20} />
                  <div>
                    <strong>Keep this page open</strong>
                    <p>It continues automatically when Sovereign is ready.</p>
                  </div>
                </li>
              </ol>

              <div className="bridge-actions">
                <button
                  className="setup-secondary-button"
                  onClick={openCompanion}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  Open or check again
                </button>
                <span>Usually detected within two seconds</span>
              </div>

              <details className="advanced-start">
                <summary>Using the developer version?</summary>
                <p>
                  Double-click <strong>Start Sovereign.cmd</strong>, or run:
                </p>
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
          id="course"
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
          id="materials"
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
                    ? "Reading your source material…"
                    : "Drop your lecture slides here"}
                </strong>
                <span>
                  PDF, PowerPoint, images, Markdown, or text · up to 60 MB
                </span>
                {!uploading && <em>Choose files</em>}
              </label>

              {!!uploadQueue.length && (
                <div className="upload-queue" aria-label="Upload progress">
                  {uploadQueue.map((item) => (
                    <div className="upload-queue-row" key={item.id}>
                      <span
                        className={`queue-state ${item.status}`}
                        aria-hidden="true"
                      >
                        {item.status === "ready" ? (
                          <Check size={13} />
                        ) : item.status === "error" ? (
                          <X size={13} />
                        ) : (
                          <LoaderCircle
                            className={
                              item.status === "waiting" ? "" : "spin"
                            }
                            size={13}
                          />
                        )}
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {uploadStatusLabel(item)}
                          {item.error ? ` · ${item.error}` : ""}
                        </span>
                        <i>
                          <span
                            style={{
                              transform: `scaleX(${item.progress / 100})`,
                            }}
                          />
                        </i>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!!activeCourse.materials.length && (
                <div className="material-workbench">
                  <div className="material-browser">
                    <div className="material-browser-heading">
                      <div>
                        <strong>Source check</strong>
                        <span>See exactly what Sovereign retained.</span>
                      </div>
                      <Sparkles aria-hidden="true" size={17} />
                    </div>
                    <div className="material-list">
                      {activeCourse.materials.map((material) => (
                        <button
                          aria-pressed={selectedMaterialId === material.id}
                          className={
                            selectedMaterialId === material.id ? "selected" : ""
                          }
                          key={material.id}
                          onClick={() =>
                            void inspectMaterial(activeCourse.id, material)
                          }
                          type="button"
                        >
                          <span className="material-type">
                            {material.kind === "powerpoint" ? (
                              <Presentation size={18} />
                            ) : material.kind === "image" ? (
                              <FileImage size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                          </span>
                          <span>
                            <strong>{material.originalName}</strong>
                            <small>
                              {material.pages}{" "}
                              {material.pages === 1 ? "page" : "slides/pages"} ·{" "}
                              {formatBytes(material.size)}
                            </small>
                          </span>
                          <ChevronRight aria-hidden="true" size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <section
                    aria-label="Source inspection"
                    className="material-inspector"
                  >
                    {!selectedMaterialId && (
                      <div className="inspector-empty">
                        <ImageIcon aria-hidden="true" size={23} />
                        <strong>Choose a source to inspect it</strong>
                        <span>
                          You’ll see its slides, extracted text, and any reading
                          warnings here.
                        </span>
                      </div>
                    )}

                    {previewLoading && (
                      <div className="inspector-loading">
                        <div className="inspector-skeleton wide" />
                        <div className="inspector-skeleton" />
                        <div className="inspector-skeleton preview" />
                      </div>
                    )}

                    {!previewLoading && materialDetail && (
                      <>
                        <header className="inspector-heading">
                          <div>
                            <span>Ready for tutoring</span>
                            <h3>{materialDetail.originalName}</h3>
                          </div>
                          <Check aria-hidden="true" size={18} />
                        </header>

                        <div className="source-signals">
                          <span>
                            <strong>{materialDetail.pages}</strong>
                            slides/pages
                          </span>
                          <span>
                            <strong>
                              {formatCompactNumber(
                                materialDetail.extractedCharacters,
                              )}
                            </strong>
                            text read
                          </span>
                          <span>
                            <strong>{materialDetail.visuals}</strong>
                            visuals retained
                          </span>
                        </div>

                        {!!materialDetail.warnings.length && (
                          <div className="source-warning">
                            <AlertTriangle aria-hidden="true" size={17} />
                            <span>{materialDetail.warnings[0]}</span>
                          </div>
                        )}

                        {materialDetail.kind === "pdf" &&
                          materialPreviewUrl && (
                            <div className="source-preview">
                              <div className="source-preview-toolbar">
                                <span>Visual preview</span>
                                <label>
                                  Page
                                  <select
                                    onChange={(event) =>
                                      setPreviewPage(Number(event.target.value))
                                    }
                                    value={previewPage}
                                  >
                                    {Array.from(
                                      { length: materialDetail.pages },
                                      (_, index) => index + 1,
                                    ).map((page) => (
                                      <option
                                        key={page}
                                        value={page}
                                      >
                                        {page}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <iframe
                                src={`${materialPreviewUrl}#page=${previewPage}&view=FitH`}
                                title={`Preview of ${materialDetail.originalName}, page ${previewPage}`}
                              />
                            </div>
                          )}

                        {materialDetail.kind === "image" &&
                          materialPreviewUrl && (
                            <figure className="source-image-preview">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={`Preview of ${materialDetail.originalName}`}
                                src={materialPreviewUrl}
                              />
                              <figcaption>
                                Sovereign will inspect this image directly during
                                tutoring.
                              </figcaption>
                            </figure>
                          )}

                        {materialDetail.kind !== "image" &&
                          materialDetail.kind !== "pdf" && (
                            <div className="slide-text-list">
                              <div className="source-preview-toolbar">
                                <span>Extracted slide text</span>
                                <small>
                                  {materialDetail.slides.length} sections
                                </small>
                              </div>
                              {materialDetail.slides
                                .slice(0, 8)
                                .map((slide) => (
                                  <article key={slide.slide}>
                                    <span>Slide {slide.slide}</span>
                                    <p>
                                      {slide.text ||
                                        "No selectable text on this slide."}
                                    </p>
                                  </article>
                                ))}
                            </div>
                          )}
                      </>
                    )}
                  </section>
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

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function uploadStatusLabel(item: UploadItem) {
  return (
    {
      waiting: "Waiting",
      uploading: `Copying locally · ${item.progress}%`,
      processing: "Reading slides and diagrams",
      ready: "Ready for tutoring",
      error: "Needs attention",
    }[item.status] ?? "Waiting"
  );
}
