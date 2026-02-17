# WebUtils Development Guide

This document captures decisions, conventions, and architectural patterns that apply across the WebUtils collection. Use this as a reference when adding new apps or modifying existing ones.

## Scope and Goals

- Each utility is a **single, static HTML file** with no build step.
- Apps work **offline** and load quickly from local disk or a static web host.
- **Vanilla HTML/CSS/JS only**; no framework runtime dependencies.
- All data storage is **client-side only** via browser localStorage.
- Portability is a first-class concern: apps can be downloaded, moved, and shared as individual files.

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

## Backups and restores
- The landing page provides a data control panel to export/import snapshots across apps.
- Snapshots are JSON files containing a version, timestamp, and per-app storage payloads.
- The snapshot export list is driven by an app registry on the landing page; add new apps there to include them in backups.
- Import restores only known apps in the registry and overwrites their stored values.

## App registry (landing page)
- The landing page maintains an `APP_REGISTRY` array that drives the Utilities navigation and data controls.
- Each entry provides the app id, label, localStorage key, href link, and a short description.
- Adding an app to the registry makes it appear in navigation, enables snapshot export/import, and surfaces the stored-data size note.

## Destructive actions
- Destructive actions must always ask for confirmation before executing.
- Use a reusable confirmation dialog pattern rather than ad-hoc `confirm()` prompts.
- For an example, see the Kanban app confirmation dialog markup and its shared helper that opens the dialog and resolves a boolean (search for the confirm dialog section in the Kanban file).

## Files
- Landing page: `docs/index.html`.
- Kanban board: `docs/kanban.html` (uses localStorage key `webutils.kanban.v1`).
- ZIP Workbench: `docs/zip-workbench.html` (uses localStorage key `webutils.zip-workbench.v1`).
- Regex Workbench: `docs/regex-workbench.html` (uses localStorage key `webutils.regex-workbench.v1`).

## Adding a New App

1. **Create the HTML file** in `docs/my-app.html`:
   - Include a `<header>` with `<h1>` and `<p>` description
   - Add a `.toolbar` div with a "Back to index" link
   - Use `webutils.my-app.v1` as the storage key
   - Implement `saveState()` and `loadState()` functions
   - Use the confirmation dialog pattern for destructive actions

2. **Register the app** in `docs/index.html`:
   - Add an entry to the `APP_REGISTRY` array
   - Use the same storage key from step 1

3. **Document the app** in `README.md`:
   - Add a section under "Apps" with features, file, and storage key
   - Update "Dependencies" if using external libraries

## Testing Checklist

When building or modifying an app:

- [ ] Data persists after reload (localStorage works)
- [ ] Destructive actions require confirmation
- [ ] Back-to-index link works
- [ ] App appears in landing page registry
- [ ] App is included in export/import controls
- [ ] Mobile layout is responsive (test at 720px breakpoint)
- [ ] No external API calls or telemetry
- [ ] Can clear all data without errors

## Common Pitfalls

- **Data not persisting**: Ensure `saveState()` is called after every change; check localStorage key is correct
- **Dialogs not appearing**: Ensure dialog markup includes `id="confirm-dialog"` and event listener is attached
- **Layout breaks on mobile**: Add responsive media queries; test at 720px width
- **External assets fail silently**: Load from CDN with fallback; document dependencies in code

## Philosophy

WebUtils apps prioritize:

1. **Simplicity**: Single files, no build step, minimal code
2. **Reliability**: Works offline, no external dependencies for core features
3. **Privacy**: Data stays local; no tracking or transmission
4. **Usability**: Keyboard-friendly, mouse-friendly, touch-friendly
5. **Portability**: Download once, use anywhere; data can be backed up and moved

When in doubt, choose the simpler approach.

## Performance Notes

- **Fast load**: Single files, minimal parsing overhead
- **Fast execution**: Vanilla JS, no framework runtime
- **Low bandwidth**: Average app size 30–100 KB
- All computation happens in the browser; no server calls
