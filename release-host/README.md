# Sovereign release host

This directory links the repository to the separate Vercel project used only
for public Sovereign Companion release artifacts. The website remains deployed
independently.

Release files are versioned and stored in Vercel Blob rather than committed to
Git or bundled into the web deployment. The website points to the immutable
installer URL in `app/companion-release.ts`.

`latest.json` is the small mutable release channel read by installed Companion
apps. Keep installers immutable, upload the new installer first, then update
the manifest only after its size and SHA-256 hash have been verified.
