"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock3,
  FileStack,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SovereignMark } from "./brand-mark";
import {
  DISCOVERY_COMPLETION_KEY,
  LEGAL_ACCEPTANCE_KEY,
  LEGAL_VERSION,
} from "./legal";

type PreludeStage = "loading" | "questions" | "reveal" | "terms";

type Choice = {
  id: string;
  label: string;
  insight: string;
};

type Question = {
  prompt: string;
  support: string;
  choices: Choice[];
};

const signalSteps = [
  { Icon: FileStack, label: "Material" },
  { Icon: BookOpenCheck, label: "Understanding" },
  { Icon: Clock3, label: "Retrieval" },
  { Icon: ShieldCheck, label: "Boundaries" },
];

const questions: Question[] = [
  {
    prompt: "Where does your course material usually end up?",
    support: "Think about slides, notes, screenshots, and useful AI answers.",
    choices: [
      {
        id: "organised",
        label: "One organised home",
        insight: "You already have structure. Sovereign can make it teachable.",
      },
      {
        id: "scattered",
        label: "Across folders and different apps",
        insight: "Your knowledge exists, but it has no shared memory yet.",
      },
      {
        id: "chat-history",
        label: "Mostly buried in AI chats",
        insight: "Useful explanations should become learning evidence, not chat archaeology.",
      },
    ],
  },
  {
    prompt: "When a hard topic returns two weeks later, what happens?",
    support: "Choose the answer that feels most familiar, not most ideal.",
    choices: [
      {
        id: "mechanism",
        label: "I can reconstruct the mechanism",
        insight: "Sovereign can pressure-test that understanding with retrieval.",
      },
      {
        id: "familiar",
        label: "It looks familiar, but I cannot explain it",
        insight: "Recognition feels fluent. Retrieval reveals whether it is actually available.",
      },
      {
        id: "restart",
        label: "I effectively start from zero",
        insight: "A tutor should remember the exact gap so you do not restart every time.",
      },
    ],
  },
  {
    prompt: "What usually breaks when you study with AI?",
    support: "We use this only to shape the introduction. Your answer stays in this page.",
    choices: [
      {
        id: "generic",
        label: "The answer is too generic",
        insight: "Sovereign retrieves from your course before it teaches.",
      },
      {
        id: "memory",
        label: "Every new chat forgets where I struggled",
        insight: "The conversation can disappear while the learning evidence remains.",
      },
      {
        id: "passive",
        label: "I read explanations instead of practising",
        insight: "A tutor should ask, wait, diagnose, and return at the right interval.",
      },
    ],
  },
  {
    prompt: "What would make a tutor feel genuinely useful?",
    support: "Pick the outcome you want to feel first.",
    choices: [
      {
        id: "evidence",
        label: "It points to the exact slide or diagram",
        insight: "Evidence will stay beside the explanation that depends on it.",
      },
      {
        id: "weakness",
        label: "It remembers my weak points",
        insight: "Misconceptions become future retrieval targets, not permanent transcripts.",
      },
      {
        id: "exam",
        label: "It makes me perform under exam conditions",
        insight: "Timed questions can test what is available without hints.",
      },
      {
        id: "direction",
        label: "It tells me what to study next",
        insight: "Each session should end with a deliberate next retrieval.",
      },
    ],
  },
];

export function OnboardingPrelude({ onComplete }: { onComplete: () => void }) {
  const shellRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<PreludeStage>("loading");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const storedAcceptance = localStorage.getItem(LEGAL_ACCEPTANCE_KEY);
    let legalAccepted = false;
    try {
      legalAccepted = JSON.parse(storedAcceptance ?? "null")?.version === LEGAL_VERSION;
    } catch {
      localStorage.removeItem(LEGAL_ACCEPTANCE_KEY);
    }
    if (legalAccepted) {
      onComplete();
      return;
    }
    const discoverySeen = Boolean(
      localStorage.getItem(DISCOVERY_COMPLETION_KEY),
    );
    const reveal = window.setTimeout(
      () => setStage(discoverySeen ? "terms" : "questions"),
      0,
    );
    return () => window.clearTimeout(reveal);
  }, [onComplete]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shellRef.current?.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: 0,
    });
  }, [stage]);

  const question = questions[questionIndex];
  const choice = question?.choices.find((item) => item.id === selectedChoice);
  const completedCount = answers.length + (selectedChoice ? 1 : 0);
  const revealLine = useMemo(() => {
    if (answers.includes("restart") || answers.includes("memory")) {
      return "You do not need another blank chat. You need continuity.";
    }
    if (answers.includes("scattered") || answers.includes("chat-history")) {
      return "Your material already has value. It needs one learning system.";
    }
    if (answers.includes("passive") || answers.includes("familiar")) {
      return "Understanding should survive contact with a question.";
    }
    return "Your study system is ready to become a tutor.";
  }, [answers]);

  function finishDiscovery() {
    localStorage.setItem(DISCOVERY_COMPLETION_KEY, "complete");
    setStage("reveal");
  }

  function continueQuestion() {
    if (!selectedChoice) return;
    const nextAnswers = [...answers, selectedChoice];
    setAnswers(nextAnswers);
    setSelectedChoice("");
    if (questionIndex === questions.length - 1) {
      localStorage.setItem(DISCOVERY_COMPLETION_KEY, "complete");
      setStage("reveal");
      return;
    }
    setQuestionIndex((current) => current + 1);
  }

  function previousQuestion() {
    if (questionIndex === 0) return;
    const previous = answers.at(-1) ?? "";
    setAnswers((current) => current.slice(0, -1));
    setQuestionIndex((current) => current - 1);
    setSelectedChoice(previous);
  }

  function acceptTerms() {
    if (!accepted) return;
    localStorage.setItem(
      LEGAL_ACCEPTANCE_KEY,
      JSON.stringify({ version: LEGAL_VERSION, acceptedAt: new Date().toISOString() }),
    );
    onComplete();
  }

  if (stage === "loading") {
    return (
      <main className="onboarding-shell onboarding-loading" aria-busy="true">
        <SovereignMark size={46} />
        <span>Preparing your study space…</span>
      </main>
    );
  }

  return (
    <main className="onboarding-shell" ref={shellRef}>
      <header className="onboarding-header">
        <Link className="landing-brand" href="/">
          <SovereignMark size={36} />
          <span>Sovereign</span>
        </Link>
        {stage === "questions" && (
          <button className="onboarding-skip" onClick={finishDiscovery} type="button">
            Skip questions
          </button>
        )}
        {stage !== "questions" && (
          <Link className="onboarding-skip" href="/">
            Back to home
          </Link>
        )}
      </header>

      {stage === "questions" && question && (
        <section className="onboarding-stage">
          <div className="onboarding-question-column">
            <div className="onboarding-progress-row">
              <span>Study check</span>
              <span>{questionIndex + 1} of {questions.length}</span>
            </div>
            <div className="onboarding-progress-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${(questionIndex + 1) / questions.length})` }} />
            </div>

            <div className="onboarding-question" key={question.prompt}>
              <h1>{question.prompt}</h1>
              <p>{question.support}</p>
              <div className="onboarding-choices" role="radiogroup" aria-label={question.prompt}>
                {question.choices.map((item) => (
                  <button
                    aria-checked={selectedChoice === item.id}
                    className={selectedChoice === item.id ? "selected" : ""}
                    key={item.id}
                    onClick={() => setSelectedChoice(item.id)}
                    role="radio"
                    type="button"
                  >
                    <span>{item.label}</span>
                    <i aria-hidden="true">{selectedChoice === item.id ? <Check size={15} /> : null}</i>
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-controls">
              <button
                aria-label="Previous question"
                className="onboarding-back"
                disabled={questionIndex === 0}
                onClick={previousQuestion}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={17} />
              </button>
              <button
                className="onboarding-next"
                disabled={!selectedChoice}
                onClick={continueQuestion}
                type="button"
              >
                {questionIndex === questions.length - 1 ? "See my study setup" : "Continue"}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </div>

          <aside className="onboarding-signal" aria-live="polite">
            <div className="signal-heading">
              <Sparkles aria-hidden="true" size={18} />
              <span>Sovereign is mapping the gap</span>
            </div>
            <div className="signal-map" aria-hidden="true">
              {signalSteps.map(({ Icon, label }, index) => {
                return (
                  <div className={completedCount > index ? "active" : ""} key={label}>
                    <span><Icon size={18} /></span>
                    <strong>{label}</strong>
                  </div>
                );
              })}
            </div>
            <p>{choice?.insight ?? "Choose what feels true. There is no ideal answer."}</p>
            <small>Your selections are not uploaded or retained.</small>
          </aside>
        </section>
      )}

      {stage === "reveal" && (
        <section className="onboarding-reveal">
          <div className="reveal-mark"><SovereignMark size={54} /></div>
          <p className="landing-kicker">Your study pattern, translated</p>
          <h1>{revealLine}</h1>
          <p>
            Sovereign turns the slides you already have into source-grounded
            tutoring, converts mistakes into future retrieval, and removes the
            conversation once the useful learning evidence has been retained.
          </p>
          <div className="reveal-sequence" aria-label="Sovereign learning sequence">
            <span>Bring the source</span><ArrowRight size={15} />
            <span>Practise the mechanism</span><ArrowRight size={15} />
            <span>Retain what changed</span>
          </div>
          <button className="onboarding-next" onClick={() => setStage("terms")} type="button">
            Build my study space
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </section>
      )}

      {stage === "terms" && (
        <section className="onboarding-legal">
          <div className="legal-intro">
            <p className="landing-kicker">One clear agreement</p>
            <h1>Your material stays yours. Your AI account stays yours.</h1>
            <p>
              Sovereign is an independent local study application. These are
              the boundaries that keep the arrangement honest.
            </p>
          </div>
          <div className="legal-promises">
            <article>
              <ShieldCheck aria-hidden="true" size={20} />
              <div><strong>Local by default</strong><p>Course files and learning records remain in your Sovereign Library. Relevant excerpts are sent only to the AI provider you choose.</p></div>
            </article>
            <article>
              <FileStack aria-hidden="true" size={20} />
              <div><strong>Bring material you may use</strong><p>You are responsible for having permission to process your slides, notes, and exam material.</p></div>
            </article>
            <article>
              <BookOpenCheck aria-hidden="true" size={20} />
              <div><strong>A tutor, not an authority</strong><p>AI can be wrong. Check important claims and follow your institution’s academic-integrity rules.</p></div>
            </article>
            <article>
              <Clock3 aria-hidden="true" size={20} />
              <div><strong>Provider access can change</strong><p>Your Codex or other AI plan is separate from Sovereign and remains subject to that provider’s terms, limits, and availability.</p></div>
            </article>
          </div>
          <label className="legal-consent">
            <input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" />
            <span>
              I agree to the <Link href="/legal/terms">Terms of Service and Sale</Link> and acknowledge the <Link href="/legal/privacy">Privacy Notice</Link>. I understand that Sovereign is not affiliated with or endorsed by OpenAI or Anthropic.
            </span>
          </label>
          <button className="onboarding-next" disabled={!accepted} onClick={acceptTerms} type="button">
            Accept and continue
            <ArrowRight aria-hidden="true" size={17} />
          </button>
          <p className="legal-version">Terms version {LEGAL_VERSION} · <Link href="/legal/notices">Third-party notices</Link></p>
        </section>
      )}
    </main>
  );
}
