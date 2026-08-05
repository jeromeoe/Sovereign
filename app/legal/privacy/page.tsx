import { LegalShell } from "../../legal-shell";

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Notice"
      summary="What remains on your device, what reaches an AI provider, and what a public Sovereign service may process."
    >
      <section>
        <h2>1. Local study data</h2>
        <p>Your original course files, extracted slide index, learning profile, and retained progress are stored in your local Sovereign Library. The hosted interface does not receive a copy of that library. You control the device and are responsible for its account security and backups.</p>
      </section>
      <section>
        <h2>2. Temporary tutoring data</h2>
        <p>To answer a question, Sovereign sends the prompt and relevant source excerpts or images to the AI provider you selected through its local client. The provider processes that information under its own privacy terms. Sovereign keeps the active conversation in local memory, distils learning evidence when you end the session, and then removes the transcript.</p>
      </section>
      <section>
        <h2>3. Information the website may process</h2>
        <p>Hosting and security providers may process technical information such as IP address, browser type, request time, and security signals. Sovereign currently has no application account and does not intentionally collect your study library through the website. If analytics, crash reporting, support forms, or accounts are added, this notice will be updated before those features are enabled.</p>
      </section>
      <section>
        <h2>4. Purchases and support</h2>
        <p>If public sales begin, the payment processor will receive transaction and billing details needed to complete the purchase and meet tax or fraud-prevention obligations. Support messages may contain the contact details and diagnostic information you choose to send. Never send passwords, AI-provider tokens, or private course files in a support request.</p>
      </section>
      <section>
        <h2>5. Purposes, retention, and sharing</h2>
        <p>Information is processed only to deliver, secure, support, and account for Sovereign. We do not sell personal information. Local study data remains until you remove it. Transaction and support records are retained only as long as reasonably necessary for the stated purpose or a legal obligation. Service providers receive only information needed to perform their function.</p>
      </section>
      <section>
        <h2>6. International processing</h2>
        <p>Hosting, payment, support, and AI providers may process information outside Singapore. Before public collection begins, Sovereign will maintain appropriate provider agreements and safeguards for transfers required by applicable data-protection law.</p>
      </section>
      <section>
        <h2>7. Your choices and rights</h2>
        <p>You can stop a tutoring session, remove local material, revoke a provider login through that provider, and uninstall Sovereign. Requests to access, correct, or delete personal information held by the Sovereign business should use the contact in your beta invitation or purchase receipt.</p>
      </section>
      <section>
        <h2>8. Security and incidents</h2>
        <p>Sovereign uses local pairing, scoped access tokens, bounded sessions, and limited filesystem access. No system is perfectly secure. Report suspected vulnerabilities privately through the support contact. Where legally required, affected people and the relevant authority will be notified of a qualifying breach.</p>
      </section>
      <section>
        <h2>9. Children and sensitive information</h2>
        <p>Sovereign is currently intended for people aged 18 or older. Do not intentionally add government identifiers, financial details, health records, confidential assessment material, or another person’s sensitive information.</p>
      </section>
      <section>
        <h2>10. Accountability</h2>
        <p>Before open public sales, Sovereign will publish its registered operator, permanent privacy contact, and Data Protection Officer contact. Until then, closed-beta participants should use the contact supplied with their invitation.</p>
      </section>
    </LegalShell>
  );
}

