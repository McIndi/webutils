const { test, expect } = require('@playwright/test');
const {
  gotoApp,
  clearWebUtilsStorage,
  seedLocalStorage,
  seedEntities,
  deepLink,
  acceptConfirmDialog,
  openPalette,
} = require('./helpers/storage');

test.describe('notes', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'notes.html');
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('loads with at least one seeded note and New note button', async ({ page }) => {
    await expect(page.locator('#note-list')).toBeVisible();
    await expect(page.locator('#new-note')).toBeVisible();
    await expect(page.locator('.note-item')).toHaveCount(1);
    await expect(page.locator('.note-item', { hasText: 'Welcome' })).toBeVisible();
  });

  test('renders sidebar controls: search, sort, export buttons', async ({ page }) => {
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#sort-toggle')).toBeVisible();
    await expect(page.locator('#export-notes')).toBeVisible();
    await expect(page.locator('#export-markdown-zip')).toBeVisible();
  });

  // ── Create note ────────────────────────────────────────────────────────────

  test('clicking New note opens an edit panel with a title input', async ({ page }) => {
    await page.locator('#new-note').click();
    await expect(page.locator('input[id^="edit-title-"]')).toBeVisible();
  });

  test('saving a note with a title adds it to the list', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('My First Note');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();
    await expect(page.locator('.note-item', { hasText: 'My First Note' })).toBeVisible();
  });

  test('saving a duplicate title shows an error', async ({ page }) => {
    // Create first note
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Dup Title');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    // Create second note with same title
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').last().fill('Dup Title');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).last().click();
    await expect(page.locator('.error-text').last()).toContainText(/already exists/i);
  });

  // ── Open / close note ──────────────────────────────────────────────────────

  test('clicking a note in the list shows an open note panel', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Clickable Note');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    await page.locator('.note-item', { hasText: 'Clickable Note' }).click();
    await expect(page.locator('.open-note')).toBeVisible();
  });

  // ── Edit note ──────────────────────────────────────────────────────────────

  test('editing a note title and saving shows the updated title in the list', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Original Title');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    // Click list item to open display view, then click Edit
    await page.locator('.note-item', { hasText: 'Original Title' }).click();
    await page.locator('.open-note button.primary', { hasText: 'Edit' }).click();

    // Update the title
    await page.locator('input[id^="edit-title-"]').clear();
    await page.locator('input[id^="edit-title-"]').fill('Renamed Title');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    await expect(page.locator('.note-item', { hasText: 'Renamed Title' })).toBeVisible();
  });

  test('tags can be saved on a note', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Tagged Note');
    await page.locator('input[id^="edit-tags-"]').fill('javascript testing');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    // Tags should appear in the list item
    await expect(page.locator('.note-item', { hasText: 'Tagged Note' })).toBeVisible();
    await expect(page.locator('.note-item .note-tag', { hasText: 'javascript' })).toBeVisible();
  });

  // ── Delete note ────────────────────────────────────────────────────────────

  test('deleting a note from edit mode closes its panel', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Delete Me');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    // Open in display mode, then switch to edit, then delete
    await page.locator('.note-item', { hasText: 'Delete Me' }).click();
    await page.locator('.open-note button.primary', { hasText: 'Edit' }).click();
    await page.locator('.open-note button.danger', { hasText: 'Delete' }).click();
    await acceptConfirmDialog(page);

    await expect(page.locator('.open-note', { hasText: 'Delete Me' })).toHaveCount(0);
  });

  test('deleting a note from display mode closes its panel', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Display Delete');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    await page.locator('.note-item', { hasText: 'Display Delete' }).click();
    // Display mode has a Delete button too
    await page.locator('.open-note button.danger', { hasText: 'Delete' }).click();
    await acceptConfirmDialog(page);

    await expect(page.locator('.open-note', { hasText: 'Display Delete' })).toHaveCount(0);
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  test('search input filters the note list', async ({ page }) => {
    // Add two notes with distinct titles
    for (const title of ['Alpha Note', 'Beta Note']) {
      await page.locator('#new-note').click();
      await page.locator('input[id^="edit-title-"]').last().fill(title);
      await page.locator('.open-note button.primary', { hasText: 'Save' }).last().click();
      // Close the open panel
      await page.locator('.note-item', { hasText: title }).click();
    }

    await page.locator('#search-input').fill('Beta');
    await expect(page.locator('.note-item', { hasText: 'Alpha Note' })).toHaveCount(0);
    await expect(page.locator('.note-item', { hasText: 'Beta Note' })).toBeVisible();
  });

  test('clearing search restores all notes', async ({ page }) => {
    for (const title of ['Gamma Note', 'Delta Note']) {
      await page.locator('#new-note').click();
      await page.locator('input[id^="edit-title-"]').last().fill(title);
      await page.locator('.open-note button.primary', { hasText: 'Save' }).last().click();
      await page.locator('.note-item', { hasText: title }).click();
    }

    await page.locator('#search-input').fill('Gamma');
    await expect(page.locator('.note-item')).toHaveCount(1);

    await page.locator('#search-input').clear();
    await expect(page.locator('.note-item')).toHaveCount(3);
  });

  test('/ focuses search and typing / inside search inserts slash', async ({ page }) => {
    await page.locator('body').click();
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();

    await page.locator('#search-input').fill('');
    await page.keyboard.type('/');
    await expect(page.locator('#search-input')).toHaveValue('/');
  });

  test('Ctrl+K opens palette while CodeMirror editor is focused', async ({ page }) => {
    await page.locator('#new-note').click();
    await expect(page.locator('.CodeMirror')).toBeVisible();
    await page.locator('.CodeMirror').click();

    await openPalette(page);
  });

  // ── Sort ───────────────────────────────────────────────────────────────────

  test('sort toggle cycles between sort modes', async ({ page }) => {
    const sortBtn = page.locator('#sort-toggle');
    const initial = await sortBtn.textContent();
    await sortBtn.click();
    const after = await sortBtn.textContent();
    expect(after).not.toBe(initial);
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('notes persist after page reload', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Persistent Note');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    await gotoApp(page, 'notes.html');
    await expect(page.locator('.note-item', { hasText: 'Persistent Note' })).toBeVisible();
  });

  test('pre-seeded note appears in the list on load', async ({ page }) => {
    const now = Date.now();
    await seedLocalStorage(page, 'webutils.notes.v1', {
      notes: [
        {
          id: 'note-seed-1',
          title: 'Seeded Note',
          content: '# Hello',
          tags: ['seeded'],
          createdAt: now,
          updatedAt: now,
        },
      ],
      openIds: [],
      selectedTags: [],
      sort: 'updated',
      sidebarWidth: null,
    });
    await gotoApp(page, 'notes.html');
    await expect(page.locator('.note-item', { hasText: 'Seeded Note' })).toBeVisible();
    await expect(page.locator('.note-tag', { hasText: 'seeded' }).first()).toBeVisible();
  });

  // ── Import / Export ────────────────────────────────────────────────────────

  test('export JSON triggers a download', async ({ page }) => {
    // Need at least one note to export
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Export Note');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-notes').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/notes.*\.json/i);
  });

  test('export JSON also updates backup chip status to backed up', async ({ page }) => {
    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Backup ledger note');
    await page.locator('.open-note button.primary', { hasText: 'Save' }).click();

    await expect(page.locator('#backup-chip')).toBeVisible();
    await expect(page.locator('#backup-chip-status')).toContainText('Never backed up');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-notes').click();
    await downloadPromise;

    await expect(page.locator('#backup-chip-status')).toContainText('Backed up');
  });
});

test.describe('notes deep links', () => {
  test('opens a linked note on initial load and also resolves on hashchange', async ({ page }) => {
    const now = Date.now();
    await clearWebUtilsStorage(page);
    await seedEntities(page, 'webutils.notes.v1', {
      notes: [
        {
          id: 'note-aaa',
          title: 'Alpha Note',
          content: 'alpha',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'note-bbb',
          title: 'Beta Note',
          content: 'beta',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      openIds: ['note-aaa'],
      selectedTags: [],
      sort: 'updated',
      sidebarWidth: null,
    });

    await page.goto(`/docs/notes.html${deepLink('note', 'note-bbb')}`);
    await expect(page.locator('[data-note-id="note-bbb"]')).toBeVisible();

    const nextHash = deepLink('note', 'note-aaa');
    await page.evaluate((hash) => {
      location.hash = hash;
    }, nextHash);

    await expect(page.locator('[data-note-id="note-aaa"]')).toBeVisible();
  });
});

test.describe('notes mentions and links', () => {
  test('copy link button writes the note URL', async ({ page }) => {
    const now = Date.now();
    await clearWebUtilsStorage(page);
    await seedEntities(page, 'webutils.notes.v1', {
      notes: [
        {
          id: 'note-copy',
          title: 'Copy Me',
          content: 'body',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      openIds: ['note-copy'],
      selectedTags: [],
      sort: 'updated',
      sidebarWidth: null,
    });
    await gotoApp(page, 'notes.html');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text) => {
            window.__copiedText = text;
            return Promise.resolve();
          },
        },
      });
    });

    await expect(page.locator('.open-note-header')).toBeVisible();
    await page.locator('.open-note .copy-link-button').click();

    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toMatch(/\/docs\/notes\.html#wu=note\/note-copy$/);
  });

  test('typing @ in the editor inserts a ranked cross-app markdown link', async ({ page }) => {
    const now = Date.now();
    await clearWebUtilsStorage(page);
    await seedEntities(page, 'webutils.regex-workbench.v1', {
      pattern: '',
      flags: 'g',
      sample: '',
      presets: [
        { id: 'preset-alpha', name: 'Zeta Alpha', pattern: 'alpha', flags: 'g', sample: '', createdAt: now },
        { id: 'preset-beta', name: 'Zeta Beta', pattern: 'beta', flags: 'g', sample: '', createdAt: now },
      ],
    });
    await gotoApp(page, 'notes.html');

    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Mention Test');
    await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.focus());
    await page.keyboard.type('@zeta');

    await expect(page.locator('#mention-popup li[role="option"]')).toHaveCount(2);
    await expect(page.locator('#mention-popup .mention-source').first()).toHaveText('Regex Workbench');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const editorValue = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue());
    expect(editorValue).toBe('[Zeta Beta](regex-workbench.html#wu=preset/preset-beta)');
  });

  test('Escape closes the mention picker and leaves the typed text intact', async ({ page }) => {
    const now = Date.now();
    await clearWebUtilsStorage(page);
    await seedEntities(page, 'webutils.regex-workbench.v1', {
      pattern: '',
      flags: 'g',
      sample: '',
      presets: [
        { id: 'preset-alpha', name: 'Zeta Alpha', pattern: 'alpha', flags: 'g', sample: '', createdAt: now },
      ],
    });
    await gotoApp(page, 'notes.html');

    await page.locator('#new-note').click();
    await page.locator('input[id^="edit-title-"]').fill('Escape Test');
    await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.focus());
    await page.keyboard.type('@que');
    await page.keyboard.press('Escape');

    await expect(page.locator('#mention-popup')).toBeHidden();

    const editorValue = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue());
    expect(editorValue).toBe('@que');
  });

  test('rendered markdown keeps javascript hrefs out of the DOM', async ({ page }) => {
    const now = Date.now();
    await clearWebUtilsStorage(page);
    await seedEntities(page, 'webutils.notes.v1', {
      notes: [
        {
          id: 'note-safe',
          title: 'Sanitized Note',
          content: '[x](javascript:alert(1))',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      openIds: [],
      selectedTags: [],
      sort: 'updated',
      sidebarWidth: null,
    });
    await gotoApp(page, 'notes.html');

    await page.locator('.note-item', { hasText: 'Sanitized Note' }).click();
    await expect(page.locator('.note-display a[href^="javascript:"]')).toHaveCount(0);
  });
});
