const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

const BASE = 'http://127.0.0.1:4173';

async function enableIndexedDbWriteFailures(page) {
  await page.addInitScript(() => {
    if (
      !window.__idbWriteFailureHarness &&
      window.IDBDatabase &&
      window.IDBDatabase.prototype &&
      typeof window.IDBDatabase.prototype.transaction === 'function'
    ) {
      const originalTransaction = window.IDBDatabase.prototype.transaction;
      let failReadWrite = true;
      window.__setIdbReadWriteFailure = (enabled) => {
        failReadWrite = !!enabled;
      };
      window.IDBDatabase.prototype.transaction = function (...args) {
        const mode = args[1];
        if (failReadWrite && mode === 'readwrite') {
          throw new Error('IndexedDB unavailable for test');
        }
        return originalTransaction.apply(this, args);
      };
      window.__idbWriteFailureHarness = true;
    }
  });
}

test.describe('index', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');
  });

  // ── Layout ─────────────────────────────────────────────────────────────────

  test('loads and renders the app list', async ({ page }) => {
    await expect(page.locator('#app-list')).toBeVisible();
    const rows = page.locator('#app-list .app-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('all registered apps appear as rows', async ({ page }) => {
    // APP_REGISTRY has 9 entries
    await expect(page.locator('#app-list .app-row')).toHaveCount(9);
  });

  test('each app row has a link to the app', async ({ page }) => {
    const links = page.locator('#app-list .app-row a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    // Every link should end in .html
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/\.html/);
    }
  });

  test('data controls section is visible: export, import, validate, clear-all', async ({ page }) => {
    await expect(page.locator('#export-button')).toBeVisible();
    await expect(page.locator('#import-file')).toBeAttached();
    await expect(page.locator('#validate-button')).toBeVisible();
    await expect(page.locator('#clear-all')).toBeVisible();
  });

  test('data status message is visible', async ({ page }) => {
    await expect(page.locator('#data-status')).toBeVisible();
  });

  // ── Dark/light mode toggle ─────────────────────────────────────────────────

  test('theme toggle button is present', async ({ page }) => {
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('clicking theme toggle switches between dark and light', async ({ page }) => {
    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');
    await page.locator('#theme-toggle').click();
    const after = await html.getAttribute('data-theme');
    expect(after).not.toBe(initial);
  });

  test('theme persists after reload', async ({ page }) => {
    // Switch to the opposite theme
    await page.locator('#theme-toggle').click();
    const theme = await page.locator('html').getAttribute('data-theme');

    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  });

  // ── Export ─────────────────────────────────────────────────────────────────

  test('export list checkboxes correspond to registered apps', async ({ page }) => {
    const checkboxes = page.locator('#export-list input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });

  test('exporting selected apps triggers a download', async ({ page }) => {
    await seedLocalStorage(page, 'webutils.notes.v1', { notes: [{ id: 'n1', title: 'Seed' }] });
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    // Check all checkboxes then export
    const checkboxes = page.locator('#export-list input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) await cb.check();
    }

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/webutils.*snapshot.*\.json/i);
  });

  // ── Validate import ────────────────────────────────────────────────────────

  test('validate button shows ok for a valid snapshot file', async ({ page }) => {
    const snapshot = {
      version: 3,
      generator: 'webutils',
      createdAt: new Date().toISOString(),
      apps: {
        notes: {
          appId: 'notes',
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [{ id: 'n1', title: 'Seed' }] }),
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/visible/);
    await expect(page.locator('#validate-result')).toHaveClass(/ok/);
  });

  test('validate button shows error for an invalid snapshot file', async ({ page }) => {
    await page.locator('#import-file').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ notASnapshot: true })),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/visible/);
    await expect(page.locator('#validate-result')).toHaveClass(/error/);
  });

  // ── Clear all ──────────────────────────────────────────────────────────────

  test('clear all data shows confirmation dialog', async ({ page }) => {
    await page.locator('#clear-all').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
  });

  test('confirming clear all updates the data status', async ({ page }) => {
    await seedLocalStorage(page, 'webutils.notes.v1', { notes: [{ id: 'n1', title: 'Seed' }] });
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#clear-all').click();
    // First dialog: "Back up all data first?" — decline to skip backup
    const dialog = page.locator('#confirm-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('button[value="cancel"]').click();
    // Second dialog: "Clear all app data?" — confirm
    await acceptConfirmDialog(page);
    await expect(page.locator('#data-status')).toContainText('Cleared all saved app data.');
  });

  // ── Backup warning ─────────────────────────────────────────────────────────

  test('backup warning is hidden by default', async ({ page }) => {
    await expect(page.locator('#backup-warning')).toBeHidden();
  });

  // ── Security & Validation: Hardened Import (Task 1-4) ──────────────────────

  test('XSS: validate renders malicious snapshot content as text (regression)', async ({ page }) => {
    const snapshot = {
      version: 4,
      createdAt: '<img src=x onerror="window.__pwned=1">',
      apps: {
        '<script>alert("xss")</script>': {
          storage: 'localStorage',
          key: 'dummy',
          value: JSON.stringify({}),
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'xss-snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/visible/);

    // Verify malicious content is rendered as text, not executed
    const pwned = await page.evaluate(() => window.__pwned);
    expect(pwned).toBeUndefined();
    await expect(page.locator('#validate-result img')).toHaveCount(0);
    await expect(page.locator('#validate-result script')).toHaveCount(0);

    // Verify the string appears in the result (as text, not as HTML)
    const resultText = await page.locator('#validate-result').textContent();
    expect(resultText).toContain('<script>alert');
  });

  test('semantic validation: bad JSON in localStorage value is caught', async ({ page }) => {
    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: 'not valid json {]',
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'bad-json.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/error/);
    const resultText = await page.locator('#validate-result').textContent();
    expect(resultText).toContain('Kanban');
    expect(resultText).toContain('not valid JSON');
  });

  test('semantic validation: wrong field type is caught', async ({ page }) => {
    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        thegym: {
          storage: 'localStorage',
          key: 'webutils.thegym.v1',
          value: JSON.stringify({
            version: 1,
            exercises: 'not an array, should be array',
            sessions: [],
            pbs: {},
          }),
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'wrong-type.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/error/);
    const resultText = await page.locator('#validate-result').textContent();
    expect(resultText).toContain('TheGym');
    expect(resultText).toContain('should be an array');
  });

  test('import preview shows before write; cancel leaves storage unchanged', async ({ page }) => {
    // Seed existing kanban data
    await seedLocalStorage(page, 'webutils.kanban.v2', {
      tracks: [{ id: 't1', name: 'Todo', cards: [] }],
    });

    // Create a snapshot with kanban + notes
    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({
            tracks: [{ id: 't2', name: 'Updated', cards: [] }],
          }),
        },
        notes: {
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [{ id: 'n1', title: 'New Note' }] }),
        },
      },
    };

    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#import-file').setInputFiles({
      name: 'preview-snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();

    // Dialog should be visible with preview
    const dialog = page.locator('#confirm-dialog');
    await expect(dialog).toBeVisible();
    const dialogText = await dialog.textContent();
    expect(dialogText).toContain('Kanban');
    expect(dialogText).toContain('Notes');
    expect(dialogText).toContain('Changes');

    // Cancel the import
    await dialog.locator('button[value="cancel"]').click();

    // Verify storage is unchanged
    const storedKanban = await page.evaluate(() => JSON.parse(localStorage.getItem('webutils.kanban.v2')));
    expect(storedKanban.tracks[0].name).toBe('Todo');

    const storedNotes = await page.evaluate(() => localStorage.getItem('webutils.notes.v1'));
    expect(storedNotes).toBeNull();
  });

  test('import preview confirm applies the snapshot and reports success', async ({ page }) => {
    await seedLocalStorage(page, 'webutils.kanban.v2', {
      tracks: [{ id: 't1', name: 'Todo', cards: [] }],
    });

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({
            tracks: [{ id: 't2', name: 'Updated', cards: [] }],
          }),
        },
        notes: {
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [{ id: 'n1', title: 'New Note' }] }),
        },
      },
    };

    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#import-file').setInputFiles({
      name: 'confirm-snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();

    const dialog = page.locator('#confirm-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#confirm-accept').click();

    await expect(page.locator('#data-status')).toContainText('Imported data for 2 app(s)');

    const storedKanban = await page.evaluate(() => JSON.parse(localStorage.getItem('webutils.kanban.v2')));
    expect(storedKanban.tracks[0].name).toBe('Updated');

    const storedNotes = await page.evaluate(() => JSON.parse(localStorage.getItem('webutils.notes.v1')));
    expect(storedNotes.notes[0].title).toBe('New Note');
  });

  test('import preview shows only selected app for per-app import', async ({ page }) => {
    // Create a multi-app snapshot
    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({ tracks: [] }),
        },
        notes: {
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [] }),
        },
        'regex-workbench': {
          storage: 'localStorage',
          key: 'webutils.regex-workbench.v1',
          value: JSON.stringify({ pattern: '.*' }),
        },
      },
    };

    // Click the kanban row's Import button; it opens a file chooser on a
    // hidden input, which Playwright intercepts.
    const kanbanRow = page.locator('#app-list .app-row').filter({ hasText: 'Kanban' });
    const fileChooserPromise = page.waitForEvent('filechooser');
    await kanbanRow.getByRole('button', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'multi-app-snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    // The preview dialog should list only kanban, not the other snapshot apps
    const dialog = page.locator('#confirm-dialog');
    await expect(dialog).toBeVisible();
    const dialogText = await dialog.textContent();
    expect(dialogText).toContain('Kanban');
    expect(dialogText).not.toContain('Notes Wiki');
    expect(dialogText).not.toContain('Regex Workbench');

    // Cancel; nothing should have been written
    await dialog.locator('button[value="cancel"]').click();
    let storedKanban = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));
    expect(storedKanban).toBeNull();

    // Re-run and confirm: only kanban is restored, other snapshot apps untouched
    const secondChooserPromise = page.waitForEvent('filechooser');
    await kanbanRow.getByRole('button', { name: 'Import' }).click();
    const secondChooser = await secondChooserPromise;
    await secondChooser.setFiles({
      name: 'multi-app-snapshot.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });
    await expect(dialog).toBeVisible();
    await dialog.locator('#confirm-accept').click();
    await expect(page.locator('#data-status')).toContainText('Imported Kanban task board');

    storedKanban = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));
    expect(storedKanban).not.toBeNull();
    const storedNotes = await page.evaluate(() => localStorage.getItem('webutils.notes.v1'));
    expect(storedNotes).toBeNull();
    const storedRegex = await page.evaluate(() => localStorage.getItem('webutils.regex-workbench.v1'));
    expect(storedRegex).toBeNull();
  });

  test('transactional restore: localStorage-only import succeeds without incomplete-report dialog', async ({ page }) => {
    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        notes: {
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [{ id: 'n1', title: 'Restored' }] }),
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'notes-only.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);

    await expect(page.locator('#data-status')).toContainText('Imported data for 1 app(s).');
    await expect(page.locator('#confirm-title')).not.toContainText('Restore incomplete');
  });

  test('transactional restore: mid-restore failure shows per-app report', async ({ page }) => {
    await enableIndexedDbWriteFailures(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({ tracks: [{ id: 't1', name: 'Imported', cards: [] }] }),
        },
        'zip-workbench': {
          storage: 'indexedDB',
          dbName: 'webutils-storage-v1',
          storeName: 'app-data',
          recordKey: 'webutils.zip-workbench.v3',
          value: {
            schemaVersion: 1,
            savedAt: new Date().toISOString(),
            zipName: 'sample.zip',
            zipBytes: { __type: 'ArrayBuffer', base64: '' },
          },
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'mid-fail.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);

    const rollbackDialog = page.locator('#confirm-dialog');
    await expect(rollbackDialog).toBeVisible();
    await expect(page.locator('#confirm-title')).toHaveText('Restore incomplete');
    await expect(rollbackDialog).toContainText('Kanban task board: Restored');
    await expect(rollbackDialog).toContainText('Zip Workbench: FAILED');
  });

  test('transactional restore: rollback restores the exact prior state', async ({ page }) => {
    await seedLocalStorage(page, 'webutils.kanban.v2', {
      tracks: [{ id: 'seed', name: 'Before', cards: [] }],
    });
    const seededRaw = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));

    await enableIndexedDbWriteFailures(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({ tracks: [{ id: 'new', name: 'After', cards: [] }] }),
        },
        'zip-workbench': {
          storage: 'indexedDB',
          dbName: 'webutils-storage-v1',
          storeName: 'app-data',
          recordKey: 'webutils.zip-workbench.v3',
          value: {
            schemaVersion: 1,
            savedAt: new Date().toISOString(),
            zipName: 'sample.zip',
            zipBytes: { __type: 'ArrayBuffer', base64: '' },
          },
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'rollback-exact.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);

    const rollbackDialog = page.locator('#confirm-dialog');
    await expect(rollbackDialog).toBeVisible();
    await page.evaluate(() => {
      if (typeof window.__setIdbReadWriteFailure === 'function') {
        window.__setIdbReadWriteFailure(false);
      }
    });
    await rollbackDialog.locator('#confirm-accept').click();

    await expect(page.locator('#data-status')).toContainText('Import rolled back');
    const currentRaw = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));
    expect(currentRaw).toBe(seededRaw);
  });

  test('transactional restore: rollback removes keys created by partial restore', async ({ page }) => {
    await enableIndexedDbWriteFailures(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('webutils.kanban.v2'));
    const beforeRaw = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));
    expect(beforeRaw).toBeNull();

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({ tracks: [{ id: 'new', name: 'Created', cards: [] }] }),
        },
        'zip-workbench': {
          storage: 'indexedDB',
          dbName: 'webutils-storage-v1',
          storeName: 'app-data',
          recordKey: 'webutils.zip-workbench.v3',
          value: {
            schemaVersion: 1,
            savedAt: new Date().toISOString(),
            zipName: 'sample.zip',
            zipBytes: { __type: 'ArrayBuffer', base64: '' },
          },
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'rollback-remove.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);

    const rollbackDialog = page.locator('#confirm-dialog');
    await expect(rollbackDialog).toBeVisible();
    await page.evaluate(() => {
      if (typeof window.__setIdbReadWriteFailure === 'function') {
        window.__setIdbReadWriteFailure(false);
      }
    });
    await rollbackDialog.locator('#confirm-accept').click();
    await expect(page.locator('#data-status')).toContainText('Import rolled back');

    const currentRaw = await page.evaluate(() => localStorage.getItem('webutils.kanban.v2'));
    expect(currentRaw).toBeNull();
  });

  test('transactional restore: keep-partial path leaves already-restored data', async ({ page }) => {
    await enableIndexedDbWriteFailures(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        kanban: {
          storage: 'localStorage',
          key: 'webutils.kanban.v2',
          value: JSON.stringify({ tracks: [{ id: 'new', name: 'KeepPartial', cards: [] }] }),
        },
        'zip-workbench': {
          storage: 'indexedDB',
          dbName: 'webutils-storage-v1',
          storeName: 'app-data',
          recordKey: 'webutils.zip-workbench.v3',
          value: {
            schemaVersion: 1,
            savedAt: new Date().toISOString(),
            zipName: 'sample.zip',
            zipBytes: { __type: 'ArrayBuffer', base64: '' },
          },
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'keep-partial.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);

    const rollbackDialog = page.locator('#confirm-dialog');
    await expect(rollbackDialog).toBeVisible();
    await rollbackDialog.locator('button[value="cancel"]').click();

    await expect(page.locator('#data-status')).toContainText('Kept partial import: 1 of 2 apps restored');
    const currentKanban = await page.evaluate(() => JSON.parse(localStorage.getItem('webutils.kanban.v2')));
    expect(currentKanban.tracks[0].name).toBe('KeepPartial');
  });

  test('transactional restore: per-app import uses failure report flow', async ({ page }) => {
    await enableIndexedDbWriteFailures(page);
    await page.goto(`${BASE}/docs/index.html`);
    await page.waitForLoadState('domcontentloaded');

    const snapshot = {
      version: 4,
      createdAt: new Date().toISOString(),
      apps: {
        'zip-workbench': {
          storage: 'indexedDB',
          dbName: 'webutils-storage-v1',
          storeName: 'app-data',
          recordKey: 'webutils.zip-workbench.v3',
          value: {
            schemaVersion: 1,
            savedAt: new Date().toISOString(),
            zipName: 'sample.zip',
            zipBytes: { __type: 'ArrayBuffer', base64: '' },
          },
        },
      },
    };

    const zipRow = page.locator('#app-list .app-row').filter({ hasText: 'Zip Workbench' });
    const fileChooserPromise = page.waitForEvent('filechooser');
    await zipRow.getByRole('button', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'zip-only-fail.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await acceptConfirmDialog(page);
    const rollbackDialog = page.locator('#confirm-dialog');
    await expect(rollbackDialog).toBeVisible();
    await expect(page.locator('#confirm-title')).toHaveText('Restore incomplete');
    await expect(rollbackDialog).toContainText('Zip Workbench: FAILED');
  });

  test('existing tests continue to pass: validate ok/error states remain', async ({ page }) => {
    // This test re-validates that existing validate functionality still works
    const validSnapshot = {
      version: 3,
      createdAt: new Date().toISOString(),
      apps: {
        notes: {
          storage: 'localStorage',
          key: 'webutils.notes.v1',
          value: JSON.stringify({ notes: [] }),
        },
      },
    };

    await page.locator('#import-file').setInputFiles({
      name: 'valid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(validSnapshot)),
    });

    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toHaveClass(/ok/);
    const okText = await page.locator('#validate-result').textContent();
    expect(okText).toContain('Valid snapshot');
  });
});
