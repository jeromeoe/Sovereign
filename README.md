# Sovereign

Sovereign is a source-grounded AI tutoring workspace. It retains university
course material locally, retrieves the most relevant slide evidence for each
question, sends bounded context through the student's own Codex CLI session,
and distils the session into durable learning evidence.

## Requirements

- Node.js `>=22.13.0`
- A Codex-supported ChatGPT plan

## Easiest first run on Windows

1. Open the Sovereign folder.
2. Double-click **Start Sovereign.cmd**.
3. Keep the Sovereign window open.
4. Open Sovereign in your browser. The setup page detects the window
   automatically and asks for its six-character code.

The launcher checks the one-time requirements, guides the student through
Codex sign-in if needed, and starts the private study connection. No terminal
commands are required.

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

PDF and PowerPoint text is extracted by slide/page and indexed locally. Images
are attached directly to Codex as visual evidence.

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
- `npm run build` — build the deployable web surface
- `npm test` — verify rendered routes and interface contracts
- `npm run test:bridge` — run a real source upload and Codex tutoring smoke test
