# WebUtils

McIndi WebUtils is a collection of pocket utilities designed for quick, focused work. Each tool ships as a single, self-contained HTML file with zero external dependencies (except for optional CDN libraries like CodeMirror for syntax highlighting). No build step, no installation—just download and open in your browser. Built and maintained by McIndi Solutions LLC.

## Features

- **Single-file apps**: Each utility is a standalone HTML file with embedded CSS and JavaScript.
- **Offline-first**: Works completely offline; no data leaves your device.
- **Browser-native storage**: Data persists in browser storage (localStorage and IndexedDB) and can be exported/imported as JSON snapshots.
- **Lightweight**: Minimal dependencies; designed to load and run quickly.
- **Mobile-friendly**: Responsive layouts that work on phones, tablets, and desktop.

## Apps

### Kanban Task Board
Plan and track work with a traditional kanban layout. Features include:
- Multiple tracks (projects), each with lanes (Backlog, Doing, Review, Done)
- Track visibility picker to show one or multiple tracks at once
- Drag-and-drop cards between lanes within the active track
- Per-card lane selector for mobile-friendly moving between lanes
- Add, edit, and delete cards with titles and notes
- Clear done archives completed cards to a collapsible Brag File with completion timestamps
- Delete tracks, or reset the entire board
- All changes persist to browser storage

**File**: `docs/kanban.html`  
**Storage key**: `webutils.kanban.v2` (migrates from legacy `webutils.kanban.v1`)

### Zip Workbench
Inspect, edit, and re-download ZIP files entirely in your browser:
- Upload a ZIP file to see its contents as a tree view
- ZIP parsing runs in a Web Worker with progress feedback to keep the UI responsive
- Edit files in an integrated code editor (CodeMirror for syntax highlighting)
- Create new files and folders inside the ZIP
- Re-package and download the modified ZIP
- Clear the current ZIP to start fresh

**File**: `docs/zip-workbench.html`  
**Storage backend**: IndexedDB (`webutils-storage-v1` / `app-data` / `webutils.zip-workbench.v3`)  
**Legacy storage key**: `webutils.zip-workbench.v2` (migrated on load)  
**External dependency**: fflate (ZIP library via CDN)

### Repo2Prompt
Fetch a ZIP URL and assemble a prompt-ready payload:
- Download a ZIP file from a URL (for example, GitHub archives)
- ZIP parsing runs in a Web Worker with progress feedback during processing
- Select which text files to include via checkboxes
- Copy a combined output payload for AI prompts
- All selections persist to storage

**File**: `docs/repo2prompt.html`  
**Storage backend**: IndexedDB (`webutils-storage-v1` / `app-data` / `webutils.repo2prompt.v2`)  
**Legacy storage key**: `webutils.repo2prompt.v1` (migrated on load)  
**External dependency**: fflate (ZIP library via CDN)

### Regex Workbench
Test and save regular expressions with live highlighting:
- Enter a pattern and flags (i, m, s, u, g)
- Paste sample text and see matches highlighted in real-time
- View capture group results from the first match (numbered and named)
- Save, load, and delete preset patterns
- All presets and patterns persist to storage

**File**: `docs/regex-workbench.html`  
**Storage key**: `webutils.regex-workbench.v1`

### Notes Wiki
Lightweight notes with Markdown and CamelCase links:
- Notes list with search and sorting
- Display mode renders Markdown to HTML
- Edit mode uses CodeMirror for Markdown
- CamelCase words link to notes and create missing notes
- Export and import notes as JSON
- Export all notes as a ZIP of Markdown files
- Export currently open notes as a standalone HTML page

**File**: `docs/notes.html`  
**Storage key**: `webutils.notes.v1`

### Static Page Generator
Create standalone HTML pages from Markdown:
- Live Markdown editing with preview
- Five templates with distinct layouts and styling
- Export a full standalone HTML file
- Auto table of contents from headings
- Drafts persist in localStorage

**File**: `docs/static-page-generator.html`  
**Storage key**: `webutils.static-page-generator.v1`

### Content Studio
Manage project messaging and publication workflows in one local workspace:
- Track projects with status, one-liners, descriptions, links, and tags
- Build a reusable asset library (blurbs, links, achievements, snippets)
- Define platforms with character limits, tone notes, and posting norms
- Compose Markdown drafts with live preview and character counting
- Run per-platform pre-publish checklists before logging posts
- Keep a searchable publication log by project and platform
- All state persists locally and can be included in landing-page snapshots

**File**: `docs/contentstudio.html`  
**Storage key**: `webutils.contentstudio.v1`

### TheGym
Practice coding skills with structured, local-first drills:
- Build custom exercises for transcription, debug, flashcard, and circuit sessions
- Run focused workouts by type or through multi-step circuit sequences
- Track session history and personal bests in browser storage
- Export/import full backups, plus exercise-only exports for sharing
- Includes migration from legacy keys into a versioned unified state key

**File**: `docs/thegym.html`  
**Storage key**: `webutils.thegym.v1` (migrates from legacy `thegym_exercises`, `thegym_sessions`, `thegym_pbs`)

### Secret Share
Exchange one-way encrypted, signed secrets without a server:
- Generate a keypair (RSA-OAEP for encryption, ECDSA P-256 for signing); private keys are passphrase-encrypted
  before they touch storage
- Copy a link embedding both public keys (in the URL fragment) to share with a teammate
- **Sending requires your own keypair too**, generated the same way as the receiver's — every outgoing secret is
  signed with it, so recipients can verify who actually sent it, not just that the link decrypts
- The teammate opens the link, generates their own keypair if they don't have one yet, types a secret, and gets
  back a link with the encrypted-and-signed payload embedded
- Open that link and unlock your private key with your passphrase to decrypt; a valid signature is checked
  automatically and shown alongside the plaintext
- Hybrid encryption (AES-GCM secret, RSA-OAEP wraps the AES key) so message length isn't limited by the RSA key size
- No server involved; ciphertext and public keys only ever travel in URLs you share yourself
- **Trusted contacts**: after verifying a fingerprint with someone out-of-band (in person, a call, a separate
  channel), save it under a name. Future links carrying that same key — and signed messages from that same
  identity — are recognized automatically, and you can send that contact a new secret anytime from the Contacts
  panel without repeating the link exchange. If a future link or signed message claims to be an existing contact
  but carries a different key, you're warned before it can overwrite the saved one. The very first link from
  someone is still only as trustworthy as the channel it arrived on — pinning doesn't replace out-of-band
  verification, it just means you only need to do that verification once per contact instead of once per message.
  The fingerprint covers both the encryption and signing public keys together, so an attacker can't mix a
  legitimate encryption key with a substituted signing key without it showing up as a different fingerprint.
- **Passphrase strength**: a 12-character minimum plus a rough entropy estimate (Shannon entropy over character
  frequency) rejects long-but-predictable passphrases (e.g. repeated characters) and shows a live strength meter.
- **Upgrading an existing keypair**: keypairs created before signing was added still work for receiving (old links
  still decrypt) but can't sign outgoing secrets or use trusted-contact recognition at full strength until
  upgraded from the identity panel. Upgrading keeps the existing encryption key and adds a signing key — this
  changes your fingerprint, so existing contacts who pinned your old fingerprint will need to re-verify you once.

**File**: `docs/secret-share.html`  
**Storage keys**: `webutils.secret-share.v1` (keypair), `webutils.secret-share.contacts.v1` (trusted contacts —
public key material only). Both are backed up and restored together as a single unit by the landing page's
snapshot export/import, under the `secret-share` app entry — one export, one import, everything comes back.

**Security notes**:
- A valid signature only proves the message was signed by whoever holds the private key matching the embedded
  sender identity — it does not by itself prove that identity belongs to a specific real person unless you've
  pinned it as a trusted contact (or verified the fingerprint out-of-band for that message).
- This app shares browser storage (`localStorage`) with every other WebUtils app when hosted on the same domain.
  That's not a risk for the public-key contact data, but it does mean the app's security is only as strong as the
  weakest app sharing its origin — a script-injection bug anywhere else on that origin could, in principle, read
  this app's stored (passphrase-wrapped) private keys. For stronger isolation, download `secret-share.html` from
  the WebUtils index (its own "Download" link) and host it on a separate domain or subdomain from the rest of
  WebUtils. A distinct origin means no other app's code can ever reach this app's local storage. This app has no
  external dependencies, so it works as a single downloaded file with no other setup.

## Landing Page

The landing page (`docs/index.html`) serves as a hub for all utilities and includes:

- **App navigation**: Links to open each app, plus download buttons to save files locally
- **Data controls**: Export/import snapshots of saved data across all apps, with validation and preview before import
- **Clear all data**: Destructive action (with confirmation) to wipe all stored data
- **Storage info**: Shows how much data each app currently stores, along with per-app backup freshness (never backed up / backed up N ago / changed since last backup)
- **Backup banner**: Warns when one or more apps have data that is not covered by any backup

## Getting Started

### Opening an App
1. Open `docs/index.html` in any modern web browser
2. Click on an app to open it, or click "Download" to save the HTML file to your computer
3. Once loaded, close and reopen the page anytime; your data persists

### Exporting Data
1. On the landing page, go to "Data controls"
2. Check the apps you want to back up
3. Click "Export selected" to download a JSON snapshot
4. Save it somewhere safe for archival or moving to another device

### Importing Data
1. Go to "Data controls" on the landing page
2. Choose a previously exported snapshot file
3. Click "Import snapshot" and confirm
4. Data for known apps is restored from the snapshot; if a write fails mid-restore, you get a detailed report and can roll back to pre-import data

### Clearing Data
- Use the "Clear all app data" button in Data controls with caution
- A confirmation dialog prevents accidental data loss

## How It Works

- **Browser storage**: App data persists in browser storage (`localStorage` for most apps, `IndexedDB` for Zip Workbench and Repo2Prompt)
- **Snapshots**: You can export all your data as a JSON file and restore it anytime
- **No accounts**: Everything is stored locally; no login or syncing required
- **Confirmation dialogs**: Destructive actions (delete, clear, import) always ask for confirmation to prevent accidents

### Backups

A per-app backup ledger is stored at `localStorage` key `webutils.backupStatus.v1`. Each entry records when that app's data was last exported and a hash of the data at the time.

- **Freshness states**: `never` (no export recorded), `fresh` (hash matches last export), or `stale` (data changed since last export).
- **localStorage apps** (Kanban, Notes Wiki, Regex Workbench, Static Page Generator, Content Studio, TheGym, Secret Share): freshness is computed by hashing the current stored value and comparing it against the ledger.
- **IndexedDB apps** (Zip Workbench, Repo2Prompt): freshness is determined by comparing the record's `savedAt` timestamp against the ledger's `exportedAt`.
- **Landing page rows**: each app row shows its current freshness alongside the stored-data size.
- **Backup banner**: appears when any app with data has never been backed up or has changed since the last backup.
- **In-app backup chip**: each app's toolbar (or Data section for TheGym) shows a compact chip with status text and a **Back up** button. Clicking it downloads a version-4 single-app snapshot that can be restored via the landing page's per-app Import. IndexedDB apps show the chip with a link to the index page instead of a direct download button.
- **Native exports also count**: TheGym's EXPORT JSON and Notes Wiki's Export JSON update the backup ledger so the chip reflects the latest export regardless of which path was used.

## Privacy & Security

- **No external tracking**: No analytics, pixels, or telemetry.
- **No servers**: All processing happens in your browser.
- **No user accounts**: No login, signup, or authentication needed.
- **Local browser storage only**: Data never leaves your device unless you explicitly export it.
- **Clearable anytime**: Use the browser's dev tools or the landing page controls to wipe data.

## Browser Support

Works in any modern browser supporting:
- ES6+ JavaScript
- CSS Grid and Flexbox
- HTML5 localStorage
- IndexedDB
- HTML5 file APIs (for ZIP upload/download)

## Technical Details

For information on:
- **Building new apps**: See [AGENTS.md](AGENTS.md#adding-a-new-app)
- **Architecture & design patterns**: See [AGENTS.md](AGENTS.md)
- **Storage and data formats**: See [AGENTS.md](AGENTS.md#data-storage)
- **Styling conventions**: See [AGENTS.md](AGENTS.md#styling-conventions)
- **Testing guidelines**: See [AGENTS.md](AGENTS.md#testing-checklist)

## Dependencies

Most apps use vanilla JavaScript. The Zip Workbench uses:
- **CodeMirror 5** (syntax highlighting)
- **fflate** (ZIP file handling)

Repo2Prompt also uses:
- **fflate** (ZIP file handling)

These are loaded from CDN and optional—the apps work without them.

Notes Wiki uses:
- **CodeMirror 5** (Markdown editor)
- **marked** (Markdown rendering)
- **DOMPurify** (HTML sanitization for rendered Markdown)
- **fflate** (ZIP file handling for Markdown exports)

Static Page Generator uses:
- **marked** (Markdown rendering)

Content Studio uses:
- **CodeMirror 5** (editor)
- **marked** (Markdown rendering)
- **DOMPurify** (HTML sanitization)

## Gap Roadmap (No Backend)

Top 5 improvements that increase daily usefulness while preserving the static, local-first model:

1. **[✓ DONE] Hardened import pipeline: safe render + semantic validation + preview**
  - Implemented: structural snapshot checks, app-specific payload validators, text-safe DOM API rendering for validation results.
  - Added: import previews showing exactly what will change before writes are applied (both full and per-app imports).
  - Result: safer validate/import flows and fewer schema-related breakages.

2. **[✓ DONE] Transactional restore flow with clear rollback behavior**
  - Implemented: staged restore with pre-write rollback journal capture, per-app restore outcomes, and stop-on-failure behavior.
  - Added: partial-restore report with rollback/keep-partial choice and rescue snapshot download when rollback itself is incomplete.
  - Result: avoids mixed-state restores and improves trust in recovery operations.

3. **[✓ DONE] Unified backup experience across index and in-app surfaces**
  - Implemented: `webutils.backupStatus.v1` ledger tracks per-app backup freshness (hash-based for localStorage apps, `savedAt`-based for IndexedDB apps).
  - Added: per-app freshness status on landing-page rows and a banner naming specific stale/never-backed apps.
  - Added: in-app backup chip in every app (full quick-backup for localStorage apps, status+link for IndexedDB apps).
  - Result: better day-to-day data hygiene and portability without leaving app context.

4. **Unified keyboard shortcuts and command controls**
  - Introduce a shared shortcut map and command palette pattern across all apps, with app-specific commands layered on top.
  - Standardize high-value actions (open search, quick export, quick import, theme toggle, navigation) behind consistent keys.
  - Outcome: faster repeat use and lower context-switch overhead for power users.

5. **Cross-app deep linking with @ autocomplete over local data**
  - Add deep-link targets for key entities (notes, assets, projects, cards, regex presets, workouts) and pass context between apps.
  - Introduce an ecosystem-wide `@` mention/autocomplete layer that searches local app data and inserts links or references.
  - Outcome: less copy/paste friction and stronger workflow continuity across the entire toolkit.

## License

MIT. Use and modify freely for personal or commercial projects.
