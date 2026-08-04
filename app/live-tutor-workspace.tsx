"use client";

import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock,
  ClipboardCheck,
  FileImage,
  FileText,
  HardDrive,
  LoaderCircle,
  Maximize2,
  Menu,
  PanelRight,
  Repeat2,
  Send,
  Sparkles,
  Square,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SovereignMark } from "./brand-mark";
import { LocalNavigation } from "./local-navigation";

const BRIDGE_URL = "http://127.0.0.1:4317";
const SESSION_SECONDS = 25 * 60;

type Material = {
  id: string;
  originalName: string;
  size: number;
  pages: number;
  kind: string;
};

type Course = {
  id: string;
  code: string;
  title: string;
  materials: Material[];
};

type Source = {
  filename: string;
  materialId: string;
  kind: string;
  preview?: string;
  page?: number;
  slide?: number;
};

type VisualEvidence = {
  materialId: string;
  filename: string;
  visualIndex: number;
  page?: number;
  slide?: number;
};

type TutorMessage = {
  id: string;
  role: "student" | "tutor";
  text: string;
  sources?: Source[];
  visuals?: VisualEvidence[];
};

type Distillation = {
  conceptsStudied: string[];
  strengths: string[];
  misconceptions: string[];
  nextRetrieval: string[];
  confidenceDelta: number;
  durationSeconds?: number;
  messageCount?: number;
  reviewAfterDays?: number;
  reviewDueAt?: string;
};

type EvidencePreview = {
  kind: "image" | "pdf";
  url: string;
  title: string;
  page: number;
};

type StudyMode = "explain" | "recall" | "revision" | "exam";

const studyModes: Array<{
  id: StudyMode;
  label: string;
  description: string;
  icon: typeof BrainCircuit;
}> = [
  {
    id: "explain",
    label: "Explain",
    description: "Build the mechanism from first principles",
    icon: BrainCircuit,
  },
  {
    id: "recall",
    label: "Recall",
    description: "Question first, answer after your attempt",
    icon: Repeat2,
  },
  {
    id: "revision",
    label: "Revision",
    description: "Target retained weak points and due reviews",
    icon: Sparkles,
  },
  {
    id: "exam",
    label: "Exam",
    description: "Timed question, then precise marking",
    icon: ClipboardCheck,
  },
];

export function LiveTutorWorkspace() {
  const [token, setToken] = useState("");
  const [course, setCourse] = useState<Course | null>(null);
  const [connectionState, setConnectionState] = useState<
    "checking" | "ready" | "missing" | "error"
  >("checking");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [sourceOpen, setSourceOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS);
  const [distilling, setDistilling] = useState(false);
  const [distillation, setDistillation] = useState<Distillation | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>("explain");
  const [examTimerActive, setExamTimerActive] = useState(false);
  const [examRemainingSeconds, setExamRemainingSeconds] = useState(10 * 60);
  const [evidencePreview, setEvidencePreview] =
    useState<EvidencePreview | null>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const loadCourse = useCallback(async (savedToken: string, courseId: string) => {
    try {
      const response = await fetch(`${BRIDGE_URL}/v1/courses`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Bridge pairing has expired.");
      const data = await response.json();
      const match = data.courses?.find((item: Course) => item.id === courseId);
      if (!match) {
        throw new Error("That course is not available in the local library.");
      }
      setCourse(match);
      setConnectionState("ready");
      window.sessionStorage.setItem("sovereign_course_id", match.id);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not reach the bridge.",
      );
      setConnectionState("error");
    }
  }, []);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      if (window.matchMedia("(max-width: 980px)").matches) {
        setSourceOpen(false);
      }
      const savedToken =
        window.sessionStorage.getItem("sovereign_bridge_token") ?? "";
      const queryCourse = new URLSearchParams(window.location.search).get(
        "course",
      );
      const savedCourse =
        queryCourse ??
        window.sessionStorage.getItem("sovereign_course_id") ??
        "";
      setToken(savedToken);
      if (!savedToken || !savedCourse) {
        setConnectionState("missing");
        return;
      }
      void loadCourse(savedToken, savedCourse);
    }, 0);
    return () => window.clearTimeout(bootstrap);
  }, [loadCourse]);

  useEffect(() => {
    if (distillation) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [distillation]);

  useEffect(() => {
    if (!examTimerActive || examRemainingSeconds === 0) return;
    const interval = window.setInterval(() => {
      setExamRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [examRemainingSeconds, examTimerActive]);

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = answer.trim();
    if (!question || !course || thinking) return;
    const studentMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "student",
      text: question,
    };
    setMessages((current) => [...current, studentMessage]);
    setAnswer("");
    setThinking(true);
    setError("");
    const answeringExamQuestion = studyMode === "exam" && examTimerActive;
    if (answeringExamQuestion) setExamTimerActive(false);

    try {
      const response = await fetch(`${BRIDGE_URL}/v1/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          sessionId,
          message: question,
          mode: studyMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The tutor could not respond.");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "tutor",
          text: data.response,
          sources: data.sources,
          visuals: data.visuals,
        },
      ]);
      if (data.sources?.length) setSourceOpen(true);
      if (studyMode === "exam" && !answeringExamQuestion) {
        setExamRemainingSeconds(10 * 60);
        setExamTimerActive(true);
      }
    } catch (chatError) {
      setError(
        chatError instanceof Error ? chatError.message : "The tutor could not respond.",
      );
    } finally {
      setThinking(false);
    }
  }

  function chooseStudyMode(mode: StudyMode) {
    setStudyMode(mode);
    if (mode !== "exam") {
      setExamTimerActive(false);
      setExamRemainingSeconds(10 * 60);
    }
    setAnswer(
      {
        explain: "Explain the most important mechanism in these slides from first principles.",
        recall: "Test my recall of the most foundational concept, one question at a time.",
        revision: "Use my retained weak points to choose what I should revise now.",
        exam: "Give me one exam-style question from this material. Do not show the solution yet.",
      }[mode],
    );
    answerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function endAndDistil() {
    if (!course) return;
    if (!messages.length) {
      setDistillation({
        conceptsStudied: [],
        strengths: [],
        misconceptions: [],
        nextRetrieval: ["Begin with one source-grounded question."],
        confidenceDelta: 0,
      });
      return;
    }
    setDistilling(true);
    setError("");
    try {
      const response = await fetch(`${BRIDGE_URL}/v1/distil`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not distil the session.");
      setDistillation(data.evidence);
      setMessages([]);
    } catch (distilError) {
      setError(
        distilError instanceof Error
          ? distilError.message
          : "Could not distil the session.",
      );
    } finally {
      setDistilling(false);
    }
  }

  const latestTutorEvidence = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "tutor" &&
        (message.sources?.length || message.visuals?.length),
    );
  const latestSources = latestTutorEvidence?.sources ?? [];
  const latestVisual = latestTutorEvidence?.visuals?.[0];
  const latestSource = latestSources[0];
  const sourceMaterial = course?.materials.find(
    (material) =>
      material.id === (latestVisual?.materialId ?? latestSource?.materialId),
  );
  const previewIdentity = latestVisual
    ? `visual:${latestVisual.materialId}:${latestVisual.visualIndex}`
    : sourceMaterial && ["pdf", "image"].includes(sourceMaterial.kind)
      ? `file:${sourceMaterial.id}:${latestSource?.page ?? 1}`
      : "";

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";

    async function loadEvidencePreview() {
      if (!course || !token || !previewIdentity) {
        setEvidencePreview(null);
        return;
      }
      try {
        const endpoint = latestVisual
          ? `${BRIDGE_URL}/v1/courses/${course.id}/materials/${latestVisual.materialId}/visuals/${latestVisual.visualIndex}`
          : `${BRIDGE_URL}/v1/courses/${course.id}/materials/${sourceMaterial?.id}/file`;
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Evidence preview is unavailable.");
        objectUrl = URL.createObjectURL(await response.blob());
        setEvidencePreview({
          kind: latestVisual || sourceMaterial?.kind === "image" ? "image" : "pdf",
          url: objectUrl,
          title: latestVisual?.filename ?? latestSource?.filename ?? "Course evidence",
          page: latestVisual?.slide ?? latestSource?.slide ?? latestSource?.page ?? 1,
        });
      } catch (previewError) {
        if ((previewError as Error).name !== "AbortError") {
          setEvidencePreview(null);
        }
      }
    }

    void loadEvidencePreview();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [course, latestSource, latestVisual, previewIdentity, sourceMaterial, token]);

  return (
    <div
      className={`workspace live-workspace ${focusMode ? "is-focus" : ""} ${
        sourceOpen ? "has-source" : ""
      }`}
    >
      <a className="skip-link" href="#live-tutor-content">
        Skip to tutoring
      </a>

      <LocalNavigation
        connected={connectionState === "ready"}
        current="Today"
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <header className="session-header">
        <div className="header-course">
          <button
            aria-label="Open navigation"
            className="menu-button icon-button"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          {focusMode && <SovereignMark size={34} />}
          <div>
            <span className="header-kicker">{course?.code ?? "SOVEREIGN"}</span>
            <strong>{course?.title ?? "Live tutor"}</strong>
          </div>
          {!focusMode && <ChevronDown aria-hidden="true" size={16} />}
        </div>

        <div className="session-controls">
          <div className="live-connection-pill">
            <span className={connectionState === "ready" ? "ready" : ""} />
            {connectionState === "ready" ? "Codex connected" : "Checking bridge"}
          </div>
          <div
            className={`session-timer ${remainingSeconds === 0 ? "complete" : ""}`}
            role="timer"
          >
            <span className="timer-dot" />
            <strong>{formatClock(remainingSeconds)}</strong>
            <small>{remainingSeconds === 0 ? "focus block complete" : "remaining"}</small>
          </div>
          <button
            aria-pressed={sourceOpen}
            className="quiet-button source-toggle"
            onClick={() => setSourceOpen((current) => !current)}
            type="button"
          >
            <PanelRight aria-hidden="true" size={17} />
            Sources
          </button>
          <button
            aria-pressed={focusMode}
            className="quiet-button focus-button"
            onClick={() => setFocusMode((current) => !current)}
            type="button"
          >
            <Maximize2 aria-hidden="true" size={17} />
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>
          <button
            className="primary-button end-button"
            disabled={distilling || connectionState !== "ready"}
            onClick={() => void endAndDistil()}
            type="button"
          >
            {distilling ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Square aria-hidden="true" fill="currentColor" size={12} />
            )}
            {distilling ? "Distilling…" : "End & distil"}
          </button>
        </div>
      </header>

      <main className="tutor-main live-tutor-main" id="live-tutor-content">
        {connectionState === "checking" && (
          <div className="live-gate">
            <LoaderCircle className="spin" size={28} />
            <p>Opening your local course library…</p>
          </div>
        )}

        {(connectionState === "missing" || connectionState === "error") && (
          <div className="live-gate live-gate-error">
            <SovereignMark size={52} />
            <p className="section-context">Local bridge required</p>
            <h1>Your tutor needs its source library.</h1>
            <p>
              {error ||
                "Connect Sovereign Bridge and retain at least one set of slides before beginning."}
            </p>
            <Link className="landing-primary" href="/setup">
              Connect and upload
              <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {connectionState === "ready" && distillation && (
          <section className="distilled-view live-distilled">
            <div className="distilled-mark">
              <Check size={22} />
            </div>
            <p className="section-context">Learning retained · transcript removed</p>
            <h1>Session distilled.</h1>
            <p className="distilled-intro">
              The bridge deleted the conversation from memory. Only the evidence
              that can improve a future session remains in your local library.
            </p>
            <div className="live-distilled-grid">
              <article>
                <span>Concepts studied</span>
                <strong>
                  {distillation.conceptsStudied.join(", ") || "No concept recorded"}
                </strong>
              </article>
              <article>
                <span>Misconceptions</span>
                <strong>
                  {distillation.misconceptions.join(", ") || "None recorded"}
                </strong>
              </article>
              <article>
                <span>Next retrieval</span>
                <strong>
                  {distillation.nextRetrieval.join(", ") || "Not scheduled"}
                </strong>
                {distillation.reviewDueAt && (
                  <small className="distilled-review-date">
                    Scheduled {formatReviewDate(distillation.reviewDueAt)}
                  </small>
                )}
              </article>
              <article>
                <span>Focused study</span>
                <strong>{formatStudyDuration(distillation.durationSeconds ?? 0)}</strong>
              </article>
            </div>
            <div className="deletion-notice">
              <HardDrive size={19} />
              <div>
                <strong>Saved to your local learning profile</strong>
                <span>No tutoring transcript was written to Codex session history.</span>
              </div>
            </div>
            <div className="distilled-actions">
              <Link className="secondary-button" href="/setup">
                Course library
              </Link>
              <button
                className="primary-button"
                onClick={() => window.location.reload()}
                type="button"
              >
                Start another session
              </button>
            </div>
          </section>
        )}

        {connectionState === "ready" && !distillation && (
          <div className="live-conversation-column">
            <section className="live-session-intro">
              <div className="tutor-presence">
                <SovereignMark inverted size={38} />
              </div>
              <p className="section-context">Sovereign · grounded in your course</p>
              <h1>
                {messages.length
                  ? "Follow the mechanism."
                  : `${course?.materials.length} source${
                      course?.materials.length === 1 ? "" : "s"
                    } retained. What are we solving?`}
              </h1>
              {!messages.length && (
                <p>
                  Ask about a confusing slide, request a concept breakdown, or
                  have Sovereign test you. Every response is generated live by
                  your Codex CLI and tied back to the retained source.
                </p>
              )}
            </section>

            <section className="study-mode-control" aria-labelledby="study-mode-heading">
              <div>
                <strong id="study-mode-heading">How should Sovereign teach?</strong>
                <span>{studyModes.find((mode) => mode.id === studyMode)?.description}</span>
              </div>
              <div className="study-mode-options">
                {studyModes.map(({ id, label, icon: Icon }) => (
                  <button
                    aria-pressed={studyMode === id}
                    className={studyMode === id ? "selected" : ""}
                    key={id}
                    onClick={() => chooseStudyMode(id)}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {studyMode === "exam" && examTimerActive && (
              <section
                className={`exam-question-clock ${
                  examRemainingSeconds === 0 ? "expired" : ""
                }`}
                aria-live="polite"
              >
                <Clock aria-hidden="true" size={18} />
                <div>
                  <strong>
                    {examRemainingSeconds === 0
                      ? "Time. Submit what you have."
                      : "Exam answer time"}
                  </strong>
                  <span>
                    {examRemainingSeconds === 0
                      ? "Sovereign will mark the answer as written."
                      : "The solution stays hidden until you submit."}
                  </span>
                </div>
                <time dateTime={`PT${examRemainingSeconds}S`}>
                  {formatClock(examRemainingSeconds)}
                </time>
              </section>
            )}

            <div className="live-message-list">
              {messages.map((message) =>
                message.role === "student" ? (
                  <article className="live-student-message" key={message.id}>
                    <span>You</span>
                    <p>{message.text}</p>
                  </article>
                ) : (
                  <article className="live-tutor-message" key={message.id}>
                    <div className="live-tutor-heading">
                      <SovereignMark size={29} />
                      <span>Source-grounded response</span>
                    </div>
                    <TutorText text={message.text} />
                    {!!message.sources?.length && (
                      <button
                        className="inline-source"
                        onClick={() => setSourceOpen(true)}
                        type="button"
                      >
                        <FileText size={16} />
                        {message.sources.length} cited source
                        {message.sources.length === 1 ? "" : "s"}
                        <PanelRight size={14} />
                      </button>
                    )}
                  </article>
                ),
              )}
            </div>

            {thinking && (
              <div className="live-thinking" role="status">
                <span className="thinking-dot" />
                <div>
                  <strong>Codex is tracing the answer through your slides</strong>
                  <span>Retrieving relevant pages and checking the mechanism…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="live-chat-error" role="alert">
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")} type="button">
                  <X size={16} />
                </button>
              </div>
            )}

            {remainingSeconds === 0 && (
              <section className="live-time-complete" aria-labelledby="focus-complete-title">
                <Clock aria-hidden="true" size={20} />
                <div>
                  <strong id="focus-complete-title">Your focus block is complete.</strong>
                  <span>Distil what changed, or take five more deliberate minutes.</span>
                </div>
                <div>
                  <button
                    className="quiet-button"
                    onClick={() => setRemainingSeconds(5 * 60)}
                    type="button"
                  >
                    Add 5 minutes
                  </button>
                  <button
                    className="primary-button"
                    disabled={distilling}
                    onClick={() => void endAndDistil()}
                    type="button"
                  >
                    End &amp; distil
                  </button>
                </div>
              </section>
            )}

            <form className="composer live-composer" onSubmit={submitAnswer}>
              <label className="sr-only" htmlFor="live-student-answer">
                Ask Sovereign about your course
              </label>
              <textarea
                id="live-student-answer"
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  studyMode === "exam" && examTimerActive
                    ? "Write your exam answer…"
                    : "Ask about a slide, concept, or past mistake…"
                }
                ref={answerRef}
                rows={3}
                value={answer}
              />
              <div className="composer-toolbar">
                <div className="live-composer-context">
                  <Sparkles size={15} />
                  Retrieved context stays bounded
                </div>
                <div className="composer-submit">
                  <span>Enter to send</span>
                  <button
                    aria-label="Send question"
                    className="send-button"
                    disabled={!answer.trim() || thinking}
                    type="submit"
                  >
                    {thinking ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </form>

            {!messages.length && (
              <div className="quick-actions" aria-label="Suggested questions">
                <button
                  onClick={() => {
                    setAnswer("Break down the most foundational concept in these slides.");
                    answerRef.current?.focus();
                  }}
                  type="button"
                >
                  Find the foundation
                </button>
                <button
                  onClick={() => {
                    setAnswer("Test me with one exam-style question from this material.");
                    answerRef.current?.focus();
                  }}
                  type="button"
                >
                  Test me
                </button>
                <button
                  onClick={() => {
                    setAnswer("What misconception would make this topic fall apart?");
                    answerRef.current?.focus();
                  }}
                  type="button"
                >
                  Find the fragile point
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <aside aria-label="Retained course evidence" className="evidence-rail live-evidence-rail">
        <div className="rail-heading">
          <div>
            <span className="rail-context">Retained locally</span>
            <strong>
              {course?.materials.length ?? 0} source
              {course?.materials.length === 1 ? "" : "s"}
            </strong>
          </div>
          <button
            aria-label="Close evidence rail"
            className="icon-button"
            onClick={() => setSourceOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="live-materials">
          {course?.materials.map((material) => (
            <article key={material.id}>
              <span>
                {material.kind === "image" ? <FileImage size={18} /> : <FileText size={18} />}
              </span>
              <div>
                <strong>{material.originalName}</strong>
                <small>
                  {material.pages} {material.pages === 1 ? "page" : "slides/pages"}
                </small>
              </div>
              <Check size={15} />
            </article>
          ))}
        </div>

        {evidencePreview && (
          <figure className="live-evidence-preview">
            <div className="live-evidence-preview-frame">
              {evidencePreview.kind === "image" ? (
                // The local bridge supplies this temporary, authenticated blob URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Diagram from ${evidencePreview.title}, slide ${evidencePreview.page}`}
                  src={evidencePreview.url}
                />
              ) : (
                <iframe
                  src={`${evidencePreview.url}#page=${evidencePreview.page}&view=FitH`}
                  title={`Preview of ${evidencePreview.title}, page ${evidencePreview.page}`}
                />
              )}
            </div>
            <figcaption>
              <span>Evidence in the latest answer</span>
              <strong>{evidencePreview.title}</strong>
              <small>Slide/page {evidencePreview.page}</small>
            </figcaption>
          </figure>
        )}

        {!!latestSources.length && (
          <section className="live-citations">
            <div className="memory-heading">
              <h2>Used in the latest answer</h2>
              <span>retrieved</span>
            </div>
            {latestSources.map((source, index) => (
              <div className="live-citation" key={`${source.filename}-${source.page}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{source.filename}</strong>
                  <small>Slide/page {source.slide ?? source.page ?? "—"}</small>
                  {source.preview && <p>{source.preview}</p>}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="live-retention-note">
          <Clock size={19} />
          <div>
            <strong>Transcript lives only for this session.</strong>
            <span>End & distil keeps the learning evidence, then clears the chat.</span>
          </div>
        </section>

        <Link className="live-add-material" href="/setup">
          <UploadCloud size={16} />
          Add more material
        </Link>
      </aside>

      <div
        aria-hidden="true"
        className={`mobile-scrim ${mobileMenuOpen ? "visible" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

function TutorText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="tutor-generated-text">
      {blocks.map((block, index) => {
        const clean = block.trim();
        if (clean.startsWith("### ")) {
          return <h3 key={`${index}-${clean}`}>{clean.slice(4)}</h3>;
        }
        if (clean.startsWith("## ")) {
          return <h2 key={`${index}-${clean}`}>{clean.slice(3)}</h2>;
        }
        if (clean.split("\n").every((line) => /^[-*]\s/.test(line))) {
          return (
            <ul key={`${index}-${clean}`}>
              {clean.split("\n").map((line) => (
                <li key={line}>{line.replace(/^[-*]\s/, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={`${index}-${clean}`}>{clean.replace(/^#+\s*/, "")}</p>;
      })}
    </div>
  );
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function formatStudyDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "for your next session";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}
