# Sovereign release host

This directory links the repository to the separate Vercel project used only
for public Sovereign Companion release artifacts. The website remains deployed
independently.

Release files are versioned and stored in Vercel Blob rather than committed to
Git or bundled into the web deployment. The Blob URL is supplied to the web
build through `NEXT_PUBLIC_SOVEREIGN_COMPANION_DOWNLOAD_URL`.
