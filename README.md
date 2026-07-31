# Sovereign

Sovereign is a source-grounded AI tutoring workspace. It retains university
course material locally, retrieves the most relevant slide evidence for each
question, sends bounded context through the student's own Codex CLI session,
and distils the session into durable learning evidence.

## Requirements

- Windows 10/11 x64 for the current companion alpha
- A Codex-supported ChatGPT plan

Developing from source additionally requires Node.js `>=22.13.0`.

## Easiest first run on Windows

1. Install **Sovereign Companion**.
2. Open it from the desktop or Windows Start menu.
3. Sign in to ChatGPT once if prompted.
4. Select **Open Sovereign**. The setup page detects the companion
   automatically and asks for its six-character code.

The companion lives quietly in the Windows tray, starts the private study
connection, displays the browser pairing code, and provides direct access to
the local Sovereign Library. No terminal, Node.js installation, or project
folder is required for the packaged app.

`Start Sovereign.cmd` remains available as a developer fallback.

### Alpha distribution note

The current installer is approximately 203 MB because it carries the Codex
runtime locally. It is not yet code-signed, so Windows SmartScreen may show an
unknown-publisher warning. Code signing and hosted installer delivery are
required before distributing Sovereign beyond the controlled alpha group.

The setup page supports the full first-run sequence: download, run the
installer, open the Companion, and automatic local detection. Set
`NEXT_PUBLIC_SOVEREIGN_COMPANION_DOWNLOAD_URL` while building the web app to
show the public **Download for Windows** action. Without a published URL, the
page clearly identifies the build as a private alpha and directs invited
testers to the installer shared with them.

Do not commit the installer into the web app. Sites/Cloudflare static assets
have a 25 MiB per-file limit. For the controlled alpha, publish the installer as
a release asset (for example, GitHub Releases) and point the variable above to
that HTTPS URL. For broad distribution, use consistent code signing or the
Microsoft Store before removing the private-alpha warning.

## Developer setup

Install dependencies and sign into the bundled Codex CLI:

```powershell
npm install
npx codex login
```

Start the local web interface:

```powershell
npm run dev
```

In a second terminal, start the local study connection:

```powershell
npm run bridge
```

Open the web interface, choose **Add your first course**, and enter the pairing
code printed in the Sovereign window. The pairing token lasts until it closes or
12 hours pass.

## Supported material

- PDF slide decks
- PowerPoint `.pptx`
- PNG, JPG, and WEBP slide captures
- Markdown and plain text notes

PDF and PowerPoint text is extracted by slide/page and indexed locally. The
setup experience shows per-file progress, exact PDF/image previews, extracted
slide text, and reading warnings before tutoring begins. PowerPoint visuals are
retained alongside their source slide and selected as visual evidence when
relevant.

## Retention model

By default, Sovereign Bridge stores its library in:

```text
~/Sovereign Library
```

Set `SOVEREIGN_DATA_DIR` to choose another directory.

- Original slide files are retained locally.
- Extracted source chunks are stored beside the course.
- Tutoring turns use Codex CLI's `--ephemeral` mode.
- The active transcript exists only in bridge memory.
- **End & distil** writes concepts, strengths, misconceptions, and next
  retrieval targets to `learning-profile.json`, then deletes the transcript.

## Architecture

```text
Sovereign web UI
        │ explicit pairing + localhost HTTP
        ▼
Sovereign Bridge
        ├── local course library
        ├── PDF / PPTX extraction
        ├── bounded source retrieval
        └── ephemeral Codex CLI execution
```

The hosted interface cannot spawn commands on a student's computer. The local
bridge provides that capability while keeping course files under the student's
control.

## Commands

- `npm run dev` — start the web interface
- `npm run bridge` — start the local Codex and material bridge
- `npm run companion` — run Sovereign Companion in development
- `npm run companion:dir` — package an unpacked Windows companion
- `npm run companion:build` — build the Windows installer
- `npm run build` — build the deployable web surface
- `npm test` — verify rendered routes and interface contracts
- `npm run test:bridge` — run a real source upload and Codex tutoring smoke test
