"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Code2,
  FileText,
  FolderOpen,
  Maximize2,
  Menu,
  MoreHorizontal,
  PanelRight,
  Plus,
  RotateCcw,
  Send,
  Settings,
  Sigma,
  Square,
  X,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { SovereignMark } from "./brand-mark";

const INITIAL_SECONDS = 23 * 60 + 41;

const primaryNavigation = [
  { label: "Today", icon: Calendar },
  { label: "Courses", icon: BookOpen },
  { label: "Library", icon: FolderOpen },
  { label: "Progress", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function MdpDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={compact ? "mdp-figure compact" : "mdp-figure"}>
      <div
        aria-label="Markov decision process diagram. State S leads to A. From A, one action leads to B with reward minus one and another leads to goal G with reward plus ten."
        className="mdp-canvas"
        role="img"
      >
        <span className="mdp-node node-s">S</span>
        <span className="mdp-node node-a">A</span>
        <span className="mdp-node node-b">B</span>
        <span className="mdp-node node-g">
          <span>G</span>
        </span>
        <span className="mdp-line line-sa" />
        <span className="mdp-line line-ab" />
        <span className="mdp-line line-ag" />
        <span className="mdp-label label-sa">
          a, 1.0 <strong>+5</strong>
        </span>
        <span className="mdp-label label-ab">
          a, 1.0 <strong>−1</strong>
        </span>
        <span className="mdp-label label-ag">
          b, 1.0 <strong>+10</strong>
        </span>
      </div>
      {!compact && (
        <figcaption>
          <span>Slide 24</span>
          Transition outcomes for one synchronous Bellman update.
        </figcaption>
      )}
    </figure>
  );
}

function SourceSlide() {
  return (
    <div className="source-slide" aria-label="Preview of slide 24, Bellman update">
      <div className="source-slide-top">
        <span>24</span>
        <strong>Bellman update</strong>
      </div>
      <div className="source-equation">
        V<sub>k+1</sub>(s) = max<sub>a</sub> Σ P(s′|s,a)
        <br />
        [R + γV<sub>k</sub>(s′)]
      </div>
      <ul>
        <li>One-step lookahead</li>
        <li>Expectation over next states</li>
        <li>Previous sweep stays fixed</li>
      </ul>
      <div className="source-slide-footer">
        Reinforcement Learning <span>24 / 58</span>
      </div>
    </div>
  );
}

export function TutorWorkspace() {
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_SECONDS);
  const [focusMode, setFocusMode] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [followupVisible, setFollowupVisible] = useState(false);
  const [isDistilled, setIsDistilled] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const responsiveState = window.setTimeout(() => {
      if (window.matchMedia("(max-width: 980px)").matches) {
        setSourceOpen(false);
      }
    }, 0);
    return () => window.clearTimeout(responsiveState);
  }, []);

  useEffect(() => {
    if (isDistilled) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setIsDistilled(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isDistilled]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || isEvaluating) return;
    setSubmittedAnswer(trimmed);
    setAnswer("");
    setIsEvaluating(true);
    setFollowupVisible(false);
    window.setTimeout(() => {
      setIsEvaluating(false);
      setFollowupVisible(true);
    }, 700);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function insertPrompt(prompt: string) {
    setAnswer(prompt);
    window.requestAnimationFrame(() => answerRef.current?.focus());
  }

  function startFreshSession() {
    setRemainingSeconds(INITIAL_SECONDS);
    setSubmittedAnswer(null);
    setFollowupVisible(false);
    setIsEvaluating(false);
    setIsDistilled(false);
    setAnswer("");
  }

  const elapsedSeconds = Math.max(0, INITIAL_SECONDS - remainingSeconds);
  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  return (
    <div
      className={`workspace ${focusMode ? "is-focus" : ""} ${
        sourceOpen ? "has-source" : ""
      }`}
    >
      <a className="skip-link" href="#tutor-content">
        Skip to tutoring
      </a>

      <nav
        aria-label="Primary navigation"
        className={`primary-nav ${mobileMenuOpen ? "mobile-open" : ""}`}
      >
        <div className="brand-lockup">
          <SovereignMark />
          <span>Sovereign</span>
          <button
            aria-label="Close navigation"
            className="mobile-close icon-button"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-items">
          {primaryNavigation.map(({ label, icon: Icon }) => (
            <button
              aria-current={label === "Today" ? "page" : undefined}
              className={label === "Today" ? "nav-item active" : "nav-item"}
              key={label}
              type="button"
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="profile-control">
          <span className="profile-avatar">AP</span>
          <span className="profile-copy">
            <strong>Alex P.</strong>
            <small>Student</small>
          </span>
          <ChevronDown aria-hidden="true" size={16} />
        </div>
      </nav>

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
            <span className="header-kicker">SC3000</span>
            <strong>Artificial Intelligence</strong>
          </div>
          {!focusMode && <ChevronDown aria-hidden="true" size={16} />}
        </div>

        <div className="session-controls">
          <div className="topic-control">
            <BookOpen aria-hidden="true" size={17} />
            <span>Value Iteration</span>
          </div>
          <div
            aria-label={`${formatClock(remainingSeconds)} remaining`}
            className="session-timer"
          >
            <span className="timer-dot" />
            <strong>{formatClock(remainingSeconds)}</strong>
            <small>remaining</small>
          </div>
          <button
            aria-pressed={sourceOpen}
            className="quiet-button source-toggle"
            onClick={() => setSourceOpen((open) => !open)}
            type="button"
          >
            <PanelRight aria-hidden="true" size={17} />
            Sources
          </button>
          <button
            aria-pressed={focusMode}
            className="quiet-button focus-button"
            onClick={() => setFocusMode((focused) => !focused)}
            type="button"
          >
            <Maximize2 aria-hidden="true" size={17} />
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>
          <button
            className="primary-button end-button"
            onClick={() => setIsDistilled(true)}
            type="button"
          >
            <Square aria-hidden="true" fill="currentColor" size={12} />
            End &amp; distil
          </button>
        </div>
      </header>

      <main className="tutor-main" id="tutor-content">
        {isDistilled ? (
          <section aria-labelledby="distilled-title" className="distilled-view">
            <div className="distilled-mark">
              <Check aria-hidden="true" size={22} strokeWidth={2.2} />
            </div>
            <p className="section-context">Learning retained · transcript temporary</p>
            <h1 id="distilled-title">Session distilled.</h1>
            <p className="distilled-intro">
              The conversation can disappear now. The evidence that improves your
              next session has already been retained.
            </p>

            <div className="distilled-results">
              <article>
                <span className="result-label">Concept strengthened</span>
                <h2>Synchronous value iteration</h2>
                <div className="mastery-change">
                  <span>40%</span>
                  <ArrowRight aria-hidden="true" size={17} />
                  <strong>52%</strong>
                </div>
              </article>
              <article>
                <span className="result-label evidence-text">Misconception recorded</span>
                <h2>Same-sweep contamination</h2>
                <p>
                  Tendency to reuse a newly calculated V<sub>k+1</sub> value before
                  the sweep is complete.
                </p>
              </article>
              <article>
                <span className="result-label">Study evidence</span>
                <h2>{elapsedMinutes} min focused</h2>
                <p>Next retrieval is scheduled for tomorrow.</p>
              </article>
            </div>

            <div className="deletion-notice">
              <Clock aria-hidden="true" size={19} />
              <div>
                <strong>Transcript deletion scheduled</strong>
                <span>Recoverable for 15 minutes, then permanently removed.</span>
              </div>
              <button className="text-button danger-text" type="button">
                Delete now
              </button>
            </div>

            <div className="distilled-actions">
              <button className="secondary-button" type="button">
                Return to Today
              </button>
              <button className="primary-button" onClick={startFreshSession} type="button">
                <RotateCcw aria-hidden="true" size={17} />
                Start fresh session
              </button>
            </div>
          </section>
        ) : (
          <div className="conversation-column">
            <section className="tutor-response" aria-labelledby="lesson-title">
              <div className="tutor-presence">
                <SovereignMark inverted size={38} />
              </div>
              <p className="section-context">Tutor · Mechanism first</p>
              <h1 id="lesson-title">Hold the previous iteration still.</h1>
              <p>
                Value iteration updates every state by looking one step ahead. But
                during a <strong>synchronous sweep</strong>, every calculation must
                read from the same untouched snapshot: V<sub>k</sub>.
              </p>
              <p>
                Think of iteration k as evidence already admitted into court.
                Iteration k+1 is the verdict being written. A verdict cannot become
                new evidence halfway through the same case.
              </p>

              <button
                className="inline-source"
                onClick={() => setSourceOpen(true)}
                type="button"
              >
                <FileText aria-hidden="true" size={17} />
                <span>Slide 24 · Bellman update</span>
                <PanelRight aria-hidden="true" size={15} />
              </button>

              <div className="diagram-explanation">
                <div>
                  <p>
                    From state A, both possible actions are evaluated against the
                    values that existed at the <em>start</em> of the sweep.
                  </p>
                  <p>
                    Only after every state has a new estimate do we replace the
                    old snapshot.
                  </p>
                </div>
                <MdpDiagram />
              </div>
            </section>

            <section className="tutor-question" aria-labelledby="question-title">
              <span className="question-marker">Q</span>
              <div>
                <h2 id="question-title">
                  Which value must remain fixed while this iteration is being calculated?
                </h2>
                <p>Explain the mechanical reason, not only the notation.</p>
              </div>
            </section>

            {submittedAnswer && (
              <section className="learner-response" aria-label="Your response">
                <div className="learner-meta">
                  <span>You</span>
                  <small>just now</small>
                </div>
                <p>{submittedAnswer}</p>
              </section>
            )}

            <div aria-live="polite">
              {isEvaluating && (
                <div className="evaluation-state">
                  <span className="thinking-dot" />
                  Sovereign is checking the reasoning against the source…
                </div>
              )}
              {followupVisible && (
                <section className="tutor-followup">
                  <div className="followup-heading">
                    <SovereignMark size={28} />
                    <strong>That preserves the boundary correctly.</strong>
                  </div>
                  <p>
                    The key is that every V<sub>k+1</sub>(s) must be comparable.
                    Mixing old and new values would make the answer depend on the
                    order in which states happened to be visited.
                  </p>
                  <button
                    className="next-question"
                    onClick={() =>
                      insertPrompt("The order would change the result because…")
                    }
                    type="button"
                  >
                    Try the transfer question
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                </section>
              )}
            </div>

            <form className="composer" onSubmit={submitAnswer}>
              <label className="sr-only" htmlFor="student-answer">
                Explain your reasoning
              </label>
              <textarea
                id="student-answer"
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Explain your reasoning…"
                ref={answerRef}
                rows={3}
                value={answer}
              />
              <div className="composer-toolbar">
                <div className="composer-tools">
                  <button aria-label="Attach material" className="icon-button" type="button">
                    <Plus size={18} />
                  </button>
                  <button aria-label="Insert equation" className="icon-button" type="button">
                    <Sigma size={18} />
                  </button>
                  <button aria-label="Insert code" className="icon-button" type="button">
                    <Code2 size={18} />
                  </button>
                  <button aria-label="More answer tools" className="icon-button" type="button">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="composer-submit">
                  <span>Enter to send</span>
                  <button
                    aria-label="Send answer"
                    className="send-button"
                    disabled={!answer.trim() || isEvaluating}
                    type="submit"
                  >
                    <Send aria-hidden="true" size={18} />
                  </button>
                </div>
              </div>
            </form>

            <div className="quick-actions" aria-label="Tutor shortcuts">
              <button
                onClick={() =>
                  insertPrompt("Give me one structural hint without revealing the answer.")
                }
                type="button"
              >
                Give me a hint
              </button>
              <button onClick={() => setSourceOpen(true)} type="button">
                Show the source
              </button>
              <button
                onClick={() =>
                  insertPrompt("Explain the same mechanism with a different analogy.")
                }
                type="button"
              >
                Explain differently
              </button>
            </div>

            <div className="context-budget">
              <span className="context-ring" />
              <span>Context resets after this session</span>
              <span aria-hidden="true">·</span>
              <strong>38% used</strong>
            </div>
          </div>
        )}
      </main>

      <aside aria-label="Evidence and session memory" className="evidence-rail">
        <div className="rail-heading">
          <div>
            <span className="rail-context">Evidence in use</span>
            <strong>1 source</strong>
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

        <SourceSlide />

        <button className="source-link" type="button">
          <span>
            <FileText aria-hidden="true" size={16} />
            Slide 24 · Bellman update
          </span>
          <ArrowRight aria-hidden="true" size={15} />
        </button>

        <section className="memory-section">
          <div className="memory-heading">
            <h2>Session memory</h2>
            <span>temporary</span>
          </div>
          <ol className="memory-timeline">
            <li>
              <span />
              <div>
                <strong>Defined MDP components</strong>
                <small>10:03</small>
              </div>
            </li>
            <li>
              <span />
              <div>
                <strong>Policy evaluation recap</strong>
                <small>14:17</small>
              </div>
            </li>
            <li className="current">
              <span />
              <div>
                <strong>Value iteration mechanism</strong>
                <small>21:08</small>
              </div>
            </li>
          </ol>
        </section>

        <section className="expiry-section">
          <Clock aria-hidden="true" size={19} />
          <div>
            <strong>Transcript expires after distillation.</strong>
            <span>Learning evidence is retained.</span>
          </div>
          <ChevronLeft aria-hidden="true" size={16} />
        </section>
      </aside>

      <div
        aria-hidden="true"
        className={`mobile-scrim ${mobileMenuOpen ? "visible" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <nav aria-label="Mobile navigation" className="mobile-nav">
        {primaryNavigation.slice(0, 4).map(({ label, icon: Icon }) => (
          <button
            aria-current={label === "Today" ? "page" : undefined}
            className={label === "Today" ? "active" : ""}
            key={label}
            type="button"
          >
            <Icon aria-hidden="true" size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
