import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Clock3,
  FileStack,
  HardDrive,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { SovereignMark } from "./brand-mark";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="Sovereign home">
          <SovereignMark size={38} />
          <span>Sovereign</span>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#mechanism">How it works</a>
          <a href="#memory">What it remembers</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <Link className="landing-open" href="/setup">
          Open Sovereign
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="landing-kicker">Your course material, made teachable</p>
          <h1>
            Your slides.
            <br />
            Your weak points.
            <br />
            <span>One tutor that remembers.</span>
          </h1>
          <p className="hero-lede">
            Sovereign turns the material your university actually gives you into
            active tutoring—grounded in your slides, shaped by your mistakes,
            and powered by the Codex plan you already have.
          </p>
          <div className="hero-actions">
            <Link className="landing-primary" href="/setup">
              Add your first course
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="landing-secondary" href="/demo">
              See the sample tutor
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <HardDrive aria-hidden="true" size={15} />
              Slides stay on your machine
            </span>
            <span>
              <Link2 aria-hidden="true" size={15} />
              Uses your Codex login
            </span>
          </div>
        </div>

        <div className="hero-study-map" aria-label="A lesson moving from course evidence to understanding">
          <div className="map-topline">
            <span>SC3000 · VALUE ITERATION</span>
            <span className="map-live">
              <i />
              Tutor active
            </span>
          </div>
          <div className="map-statement">
            <span className="map-step">01</span>
            <p>Hold the previous iteration still.</p>
          </div>
          <div className="map-path" aria-hidden="true">
            <span className="map-node map-source">S</span>
            <i className="map-rule one" />
            <span className="map-node">A</span>
            <i className="map-rule two" />
            <span className="map-node map-goal">G</span>
            <span className="map-reward">+10</span>
          </div>
          <div className="map-explanation">
            Every state reads from the same untouched snapshot. Otherwise the
            answer depends on the order in which states were visited.
          </div>
          <div className="map-source-row">
            <FileStack aria-hidden="true" size={17} />
            <span>Slide 24 · Bellman update</span>
            <span>evidence</span>
          </div>
          <div className="map-question">
            <span>Q</span>
            <p>Why must Vₖ remain fixed during a synchronous sweep?</p>
          </div>
        </div>
      </section>

      <section className="landing-mechanism" id="mechanism">
        <div className="section-heading">
          <p className="landing-kicker">The mechanism</p>
          <h2>From lecture dump to deliberate practice.</h2>
          <p>
            The interface is quiet because the machinery underneath it is doing
            the heavy lifting.
          </p>
        </div>
        <div className="mechanism-steps">
          <article>
            <span className="step-number">01</span>
            <FileStack aria-hidden="true" size={25} />
            <h3>Retain the source</h3>
            <p>
              Upload PDF, PowerPoint, or image slides. Sovereign extracts and
              indexes the material locally by slide and page.
            </p>
          </article>
          <article>
            <span className="step-number">02</span>
            <Brain aria-hidden="true" size={25} />
            <h3>Retrieve the right evidence</h3>
            <p>
              Each question pulls the most relevant source passages into the
              tutor—not your entire course history on every turn.
            </p>
          </article>
          <article>
            <span className="step-number">03</span>
            <Sparkles aria-hidden="true" size={25} />
            <h3>Distil what changed</h3>
            <p>
              The transcript disappears. Concepts studied, misconceptions, and
              the next retrieval target remain.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-memory" id="memory">
        <div className="memory-contrast">
          <div className="contrast-before">
            <span>Ordinary AI chat</span>
            <p>“Explain this again.”</p>
            <p>“Here is a general explanation…”</p>
            <p>“What did I struggle with last week?”</p>
            <small>Context grows. History becomes noise.</small>
          </div>
          <div className="contrast-after">
            <span>Sovereign</span>
            <div>
              <Check aria-hidden="true" size={16} />
              <p>Systems thinking remains fragile</p>
            </div>
            <div>
              <Check aria-hidden="true" size={16} />
              <p>Same-sweep contamination recorded</p>
            </div>
            <div>
              <Clock3 aria-hidden="true" size={16} />
              <p>Retrieve again tomorrow</p>
            </div>
            <small>Conversation removed. Learning evidence retained.</small>
          </div>
        </div>
        <div className="memory-copy">
          <p className="landing-kicker">Memory with a purpose</p>
          <h2>It remembers the learner, not the conversation.</h2>
          <p>
            A chat log is not a learning model. Sovereign deliberately separates
            short-lived conversation from durable evidence about what you know,
            what you confuse, and what needs another retrieval.
          </p>
          <Link href="/setup">
            Build your learning record
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </section>

      <section className="landing-local" id="privacy">
        <div>
          <p className="landing-kicker">Sovereign by design</p>
          <h2>Your model. Your material. Your machine.</h2>
        </div>
        <div className="local-grid">
          <article>
            <Link2 aria-hidden="true" size={22} />
            <h3>Bring your Codex plan</h3>
            <p>
              The local bridge uses the official Codex CLI you sign into—no
              second model subscription hidden behind the interface.
            </p>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" size={22} />
            <h3>Pair explicitly</h3>
            <p>
              A one-time code connects this site to the bridge. Unknown websites
              cannot silently reach your local course library.
            </p>
          </article>
          <article>
            <BookOpen aria-hidden="true" size={22} />
            <h3>Keep the source inspectable</h3>
            <p>
              Answers cite the filename and slide that supported them, so the
              tutor remains accountable to your actual course.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-final">
        <SovereignMark size={58} />
        <p className="landing-kicker">Begin with one course</p>
        <h2>Bring the slides. Ask the real question.</h2>
        <p>Five minutes from an empty library to your first source-grounded tutor response.</p>
        <Link className="landing-primary" href="/setup">
          Set up Sovereign
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/">
          <SovereignMark size={31} />
          <span>Sovereign</span>
        </Link>
        <p>Study with intent.</p>
        <div className="landing-legal-links">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/notices">Notices</Link>
          <span>Closed beta · 2026</span>
        </div>
      </footer>
    </main>
  );
}
