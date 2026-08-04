"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  Clock3,
  Flame,
  LoaderCircle,
  Menu,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LocalNavigation } from "./local-navigation";

const BRIDGE_URL = "http://127.0.0.1:4317";

type RankedEvidence = { text: string; count: number };

type CourseProgress = {
  id: string;
  code: string;
  title: string;
  materialCount: number;
  sessions: number;
  durationSeconds: number;
  confidence: number;
  lastStudiedAt: string;
  concepts: RankedEvidence[];
  misconceptions: RankedEvidence[];
  nextRetrieval: RankedEvidence[];
};

type ProgressData = {
  totals: {
    sessions: number;
    durationSeconds: number;
    currentStreak: number;
    courses: number;
  };
  courses: CourseProgress[];
};

export function LocalProgressWorkspace() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadProgress = useCallback(async () => {
    const token = window.sessionStorage.getItem("sovereign_bridge_token") ?? "";
    if (!token) {
      setState("missing");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`${BRIDGE_URL}/v1/progress`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Your local progress could not be read.");
      }
      setData(body);
      setState("ready");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Your local progress could not be read.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    const bootstrap = window.setTimeout(() => void loadProgress(), 0);
    return () => window.clearTimeout(bootstrap);
  }, [loadProgress]);

  const priorityCourse = data?.courses.find(
    (course) => course.nextRetrieval.length || course.misconceptions.length,
  );

  return (
    <div className="workspace progress-workspace">
      <a className="skip-link" href="#progress-content">
        Skip to progress
      </a>
      <LocalNavigation
        connected={state === "ready"}
        current="Progress"
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <header className="session-header progress-header">
        <div className="header-course">
          <button
            aria-label="Open navigation"
            className="menu-button icon-button"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          <div>
            <span className="header-kicker">LOCAL LEARNING PROFILE</span>
            <strong>Progress</strong>
          </div>
        </div>
        <button
          className="quiet-button"
          disabled={state === "loading"}
          onClick={() => void loadProgress()}
          type="button"
        >
          {state === "loading" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <RotateCcw aria-hidden="true" size={16} />
          )}
          Refresh
        </button>
      </header>

      <main className="progress-main" id="progress-content">
        {state === "loading" && (
          <div className="progress-gate" role="status">
            <LoaderCircle className="spin" size={26} />
            <p>Reading the learning evidence on this computer…</p>
          </div>
        )}

        {(state === "missing" || state === "error") && (
          <section className="progress-gate progress-gate-error">
            <Brain size={34} strokeWidth={1.5} />
            <h1>Your progress lives with your local library.</h1>
            <p>
              {message ||
                "Open Sovereign Companion and connect this browser to see your retained learning evidence."}
            </p>
            <Link className="landing-primary" href="/setup">
              Connect Sovereign
              <ArrowRight size={18} />
            </Link>
          </section>
        )}

        {state === "ready" && data && (
          <>
            <section className="progress-intro">
              <p className="section-context">Retained learning, not retained chat</p>
              <h1>What your next session should know.</h1>
              <p>
                These signals were distilled after tutoring sessions and stored in
                your Sovereign Library. They never require a cloud database.
              </p>
            </section>

            <section className="progress-metrics" aria-label="Study totals">
              <article>
                <BookOpen aria-hidden="true" size={19} />
                <span>Sessions distilled</span>
                <strong>{data.totals.sessions}</strong>
              </article>
              <article>
                <Clock3 aria-hidden="true" size={19} />
                <span>Focused study</span>
                <strong>{formatDuration(data.totals.durationSeconds)}</strong>
              </article>
              <article>
                <Flame aria-hidden="true" size={19} />
                <span>Current streak</span>
                <strong>
                  {data.totals.currentStreak} day
                  {data.totals.currentStreak === 1 ? "" : "s"}
                </strong>
              </article>
            </section>

            {data.totals.sessions === 0 ? (
              <section className="progress-empty">
                <Target size={30} strokeWidth={1.5} />
                <h2>Your first signal appears after one session.</h2>
                <p>
                  Ask the tutor a real question, then choose End &amp; distil. The
                  conversation disappears; the useful learning evidence remains.
                </p>
                <Link className="primary-button" href="/tutor">
                  Start tutoring
                  <ArrowRight size={17} />
                </Link>
              </section>
            ) : (
              <>
                {priorityCourse && (
                  <section className="progress-priority">
                    <div>
                      <span>Recommended next</span>
                      <strong>{priorityCourse.code}</strong>
                    </div>
                    <div>
                      <h2>
                        {priorityCourse.nextRetrieval[0]?.text ??
                          priorityCourse.misconceptions[0]?.text}
                      </h2>
                      <p>
                        Sovereign will bring this learning evidence into the next
                        source-grounded tutoring session.
                      </p>
                    </div>
                    <Link href={`/tutor?course=${priorityCourse.id}`}>
                      Study this now
                      <ArrowRight size={17} />
                    </Link>
                  </section>
                )}

                <section className="course-progress-list" aria-labelledby="courses-heading">
                  <div className="progress-section-heading">
                    <h2 id="courses-heading">Courses</h2>
                    <span>{data.courses.length} retained locally</span>
                  </div>
                  {data.courses.map((course) => (
                    <article className="course-progress-row" key={course.id}>
                      <div className="course-progress-name">
                        <span>{course.code}</span>
                        <strong>{course.title}</strong>
                        <small>
                          {course.sessions} session{course.sessions === 1 ? "" : "s"} ·{" "}
                          {formatDuration(course.durationSeconds)}
                        </small>
                      </div>
                      <div className="course-confidence">
                        <div>
                          <span>Working confidence</span>
                          <strong>{course.confidence}%</strong>
                        </div>
                        <div
                          aria-label={`${course.confidence}% working confidence`}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={course.confidence}
                          className="confidence-track"
                          role="progressbar"
                        >
                          <span style={{ width: `${course.confidence}%` }} />
                        </div>
                      </div>
                      <div className="course-weak-point">
                        <span>Watch next</span>
                        <strong>
                          {course.misconceptions[0]?.text ??
                            course.nextRetrieval[0]?.text ??
                            "No recurring weak point yet"}
                        </strong>
                      </div>
                      <Link
                        aria-label={`Study ${course.title}`}
                        href={`/tutor?course=${course.id}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </article>
                  ))}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <div
        aria-hidden="true"
        className={`mobile-scrim ${mobileMenuOpen ? "visible" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
