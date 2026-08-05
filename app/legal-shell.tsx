import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { SovereignMark } from "./brand-mark";
import { LEGAL_EFFECTIVE_DATE } from "./legal";

export function LegalShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link className="landing-brand" href="/">
          <SovereignMark size={34} />
          <span>Sovereign</span>
        </Link>
        <nav aria-label="Legal documents">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/notices">Notices</Link>
        </nav>
      </header>
      <article className="legal-document">
        <Link className="setup-back" href="/setup">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to setup
        </Link>
        <div className="legal-document-title">
          <p>Effective {LEGAL_EFFECTIVE_DATE}</p>
          <h1>{title}</h1>
          <span>{summary}</span>
        </div>
        <div className="legal-prose">{children}</div>
      </article>
      <footer className="legal-footer">
        <span>Sovereign · Closed beta</span>
        <p>Contact details are provided in your beta invitation or purchase receipt.</p>
      </footer>
    </main>
  );
}

