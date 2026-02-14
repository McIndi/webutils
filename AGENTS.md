# WebUtils Decisions

This document captures decisions and conventions that apply across the static apps in this repo.

## Scope and goals
- Each utility is a single, static HTML file (no build step).
- Works offline and loads quickly from local disk or a simple static host.
- Vanilla HTML/CSS/JS only; no framework runtime.

## Data storage (current standard)
- Storage is browser localStorage for persistence across reloads.
- Storage keys are scoped per app using a stable prefix: `webutils.<app>.v1`.
- Data is stored as JSON (stringified arrays or objects).
- Apps read from storage on load and persist on each change.

## Cross-app data sharing (future-compatible)
- localStorage is per-origin (host + port + scheme). If apps are served from the same origin, they can access each other’s localStorage entries.
- To allow shared data in the future, keep storage keys predictable and avoid collisions. Shared data should live under a dedicated key such as `webutils.shared.v1`.

## Privacy and portability
- All data stays on the user’s device and is never transmitted by the app.
- Clearing browser storage or using another device will remove data unless the user exports it (export/import may be added later).

## Versioning and migrations
- Include a version in storage keys (example: `.v1`).
- If the schema changes, increment the version and optionally migrate old data.

## Destructive actions
- Destructive actions must always ask for confirmation before executing.
- Use a reusable confirmation dialog pattern rather than ad-hoc `confirm()` prompts.
- For an example, see the Kanban app confirmation dialog markup and its shared helper that opens the dialog and resolves a boolean (search for the confirm dialog section in the Kanban file).

## Files
- Landing page: `src/index.html`.
- Kanban board: `src/kanban.html` (uses localStorage key `webutils.kanban.v1`).
