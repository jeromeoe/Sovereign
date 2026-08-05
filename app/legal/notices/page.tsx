import Link from "next/link";
import { LegalShell } from "../../legal-shell";

export default function NoticesPage() {
  return (
    <LegalShell
      title="Third-party notices"
      summary="Open-source software included with Sovereign Companion and the independent services it can connect to."
    >
      <section>
        <h2>OpenAI Codex CLI</h2>
        <p>Sovereign Companion includes the open-source Codex CLI, copyright OpenAI, licensed under the Apache License 2.0. The licence permits redistribution subject to its conditions. A complete copy is included inside the installed application.</p>
        <p><Link href="https://github.com/openai/codex/blob/main/LICENSE">Read the upstream Codex licence</Link></p>
      </section>
      <section>
        <h2>Electron and bundled dependencies</h2>
        <p>Sovereign Companion includes Electron, Chromium, Node.js, and other open-source packages. Their licence texts and attribution notices are distributed with the installed application. Those authors do not endorse Sovereign and provide their work under their respective licences.</p>
      </section>
      <section>
        <h2>Independent services</h2>
        <p>OpenAI, Codex, Anthropic, Claude, Microsoft, Windows, and university names or marks belong to their respective owners. References describe compatibility only. Sovereign is not affiliated with or endorsed by those organisations.</p>
      </section>
    </LegalShell>
  );
}

