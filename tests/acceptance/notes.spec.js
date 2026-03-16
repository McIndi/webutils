const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

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
});
