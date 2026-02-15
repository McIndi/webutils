# WebUtils

A collection of pocket utilities designed for quick, focused work. Each tool ships as a single, self-contained HTML file with zero external dependencies (except for optional CDN libraries like CodeMirror for syntax highlighting). No build step, no installation—just download and open in your browser.

## Features

- **Single-file apps**: Each utility is a standalone HTML file with embedded CSS and JavaScript.
- **Offline-first**: Works completely offline; no data leaves your device.
- **Browser-native storage**: All data persists in browser localStorage and can be exported/imported as JSON snapshots.
- **Lightweight**: Minimal dependencies; designed to load and run quickly.
- **Mobile-friendly**: Responsive layouts that work on phones, tablets, and desktop.

## Apps

### Kanban Task Board
Plan and track work with a traditional kanban layout. Features include:
- Drag-and-drop cards between lanes (Backlog, Doing, Review, Done)
- Add, edit, and delete cards with titles and notes
- Clear completed cards or reset the entire board
- All changes persist to browser storage

**File**: `src/kanban.html`  
**Storage key**: `webutils.kanban.v1`

### Zip Workbench
Inspect, edit, and re-download ZIP files entirely in your browser:
- Upload a ZIP file to see its contents as a tree view
- Edit files in an integrated code editor (CodeMirror for syntax highlighting)
- Re-package and download the modified ZIP
- Clear the current ZIP to start fresh

**File**: `src/zip-workbench.html`  
**Storage key**: `webutils.zip-workbench.v1`  
**External dependency**: fflate (ZIP library via CDN)

### Repo2Prompt
Fetch a ZIP URL and assemble a prompt-ready payload:
- Download a ZIP file from a URL (for example, GitHub archives)
- Select which text files to include via checkboxes
- Copy a combined output payload for AI prompts
- All selections persist to storage

**File**: `src/repo2prompt.html`  
**Storage key**: `webutils.repo2prompt.v1`  
**External dependency**: fflate (ZIP library via CDN)

### Regex Workbench
Test and save regular expressions with live highlighting:
- Enter a pattern and flags (i, m, s, u, g)
- Paste sample text and see matches highlighted in real-time
- View capture group results from the first match (numbered and named)
- Save, load, and delete preset patterns
- All presets and patterns persist to storage

**File**: `src/regex-workbench.html`  
**Storage key**: `webutils.regex-workbench.v1`

## Landing Page

The landing page (`src/index.html`) serves as a hub for all utilities and includes:

- **App navigation**: Links to open each app, plus download buttons to save files locally
- **Data controls**: Export/import snapshots of saved data across all apps
- **Clear all data**: Destructive action (with confirmation) to wipe all stored data
- **Storage info**: Shows how much data each app currently stores

## Getting Started

### Opening an App
1. Open `src/index.html` in any modern web browser
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
4. Data for known apps is restored from the snapshot

### Clearing Data
- Use the "Clear all app data" button in Data controls with caution
- A confirmation dialog prevents accidental data loss

## How It Works

- **Browser storage**: All app data (tasks, ZIP history, regex presets) persists in your browser's localStorage
- **Snapshots**: You can export all your data as a JSON file and restore it anytime
- **No accounts**: Everything is stored locally; no login or syncing required
- **Confirmation dialogs**: Destructive actions (delete, clear, import) always ask for confirmation to prevent accidents

## Privacy & Security

- **No external tracking**: No analytics, pixels, or telemetry.
- **No servers**: All processing happens in your browser.
- **No user accounts**: No login, signup, or authentication needed.
- **Local storage only**: Data never leaves your device unless you explicitly export it.
- **Clearable anytime**: Use the browser's dev tools or the landing page controls to wipe data.

## Browser Support

Works in any modern browser supporting:
- ES6+ JavaScript
- CSS Grid and Flexbox
- HTML5 localStorage
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
- **CodeMirror 6** (syntax highlighting)
- **fflate** (ZIP file handling)

Repo2Prompt also uses:
- **fflate** (ZIP file handling)

These are loaded from CDN and optional—the apps work without them.

## License

MIT. Use and modify freely for personal or commercial projects.
