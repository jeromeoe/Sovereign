# Sovereign Bridge

Sovereign Bridge is the local companion between the hosted interface and the
student's own Codex CLI session.

## Start

```powershell
npm run bridge
```

The bridge prints a one-time pairing code. Enter that code on Sovereign's
connection screen and keep the terminal window open while studying.

If Codex is not yet authenticated:

```powershell
npx codex login
```

## Local retention

Course files, extracted slide text, and distilled learning evidence are stored
in `~/Sovereign Library` by default. Set `SOVEREIGN_DATA_DIR` to use another
directory.

Tutoring turns run with Codex CLI's `--ephemeral` flag. Session transcripts live
only in bridge memory and are removed after distillation or when the bridge
stops.
