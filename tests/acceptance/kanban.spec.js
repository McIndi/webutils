const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, acceptConfirmDialog } = require('./helpers/storage');

test.describe('kanban', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'kanban.html');
  });

  // ── Layout ─────────────────────────────────────────────────────────────────

  test('renders board heading and four lanes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Kanban Task Board/i })).toBeVisible();
    for (const lane of ['Backlog', 'Doing', 'Review', 'Done']) {
      await expect(page.locator('.lane h2', { hasText: lane }).first()).toBeVisible();
    }
  });

  test('loads with the default "My Project" track selected', async ({ page }) => {
    await expect(page.locator('#track-select option:checked')).toContainText('My Project');
  });

  // ── Add card ───────────────────────────────────────────────────────────────

  test('adds a card to the Backlog lane', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Test card alpha');
    // lane select defaults to "backlog" – no change needed
    await page.locator('details.track-add-task button[type="submit"]').click();
    await expect(page.locator('.card-title', { hasText: 'Test card alpha' })).toBeVisible();
  });

  test('adds a card to the Doing lane when selected', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Doing card');
    await page.locator('select[id^="lane-"]').selectOption('doing');
    await page.locator('details.track-add-task button[type="submit"]').click();
    // The Doing lane must contain the new card
    const doingLane = page.locator('.lane').filter({ has: page.locator('h2', { hasText: 'Doing' }) });
    await expect(doingLane.locator('.card-title', { hasText: 'Doing card' })).toBeVisible();
  });

  test('rejects an empty card title silently', async ({ page }) => {
    const before = await page.locator('.card-title').count();
    await page.locator('details.track-add-task summary').click();
    await page.locator('details.track-add-task button[type="submit"]').click();
    await expect(page.locator('.card-title')).toHaveCount(before);
  });

  // ── Move card ──────────────────────────────────────────────────────────────

  test('moves a card between lanes using the move select', async ({ page }) => {
    // Add a backlog card
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Move me');
    await page.locator('details.track-add-task button[type="submit"]').click();
    await expect(page.locator('.card-title', { hasText: 'Move me' })).toBeVisible();

    // Expand the specific card, then move it
    const card = page.locator('.card').filter({ has: page.locator('.card-title', { hasText: 'Move me' }) }).first();
    await card.locator('.card-toggle').click();
    await card.locator('select[id^="move-"]').selectOption('doing');

    const doingLane = page.locator('.lane').filter({ has: page.locator('h2', { hasText: 'Doing' }) });
    await expect(doingLane.locator('.card-title', { hasText: 'Move me' })).toBeVisible();
  });

  // ── Edit notes ─────────────────────────────────────────────────────────────

  test('opens note editor on card, saves note text', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Noted card');
    await page.locator('details.track-add-task button[type="submit"]').click();

    const card = page.locator('.card').filter({ has: page.locator('.card-title', { hasText: 'Noted card' }) }).first();
    await card.locator('.card-toggle').click();
    await card.locator('button.primary', { hasText: 'Edit notes' }).click();
    await expect(page.locator('#note-editor')).toBeVisible();

    await page.locator('#note-editor-text').fill('These are my notes.');
    await page.locator('#note-editor button.primary').click();
    await expect(page.locator('#note-editor')).not.toBeVisible();
  });

  // ── Remove card ────────────────────────────────────────────────────────────

  test('removes a card after confirming the dialog', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Doomed card');
    await page.locator('details.track-add-task button[type="submit"]').click();
    await expect(page.locator('.card-title', { hasText: 'Doomed card' })).toBeVisible();

    const card = page.locator('.card').filter({ has: page.locator('.card-title', { hasText: 'Doomed card' }) }).first();
    await card.locator('.card-toggle').click();
    await card.locator('button.danger', { hasText: 'Remove' }).click();
    await acceptConfirmDialog(page);

    await expect(page.locator('.card-title', { hasText: 'Doomed card' })).not.toBeVisible();
  });

  test('cancelling the remove dialog keeps the card', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Keeper card');
    await page.locator('details.track-add-task button[type="submit"]').click();

    const card = page.locator('.card').filter({ has: page.locator('.card-title', { hasText: 'Keeper card' }) }).first();
    await card.locator('.card-toggle').click();
    await card.locator('button.danger', { hasText: 'Remove' }).click();
    const dialog = page.locator('#confirm-dialog');
    await expect(dialog).toBeVisible();
    // Cancel instead of confirming
    await dialog.locator('button', { hasText: /Cancel/i }).click();

    await expect(page.locator('.card-title', { hasText: 'Keeper card' })).toBeVisible();
  });

  // ── Mark complete ──────────────────────────────────────────────────────────

  test('mark-complete moves card to brag file', async ({ page }) => {
    // Add a card directly to the Done lane
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Completed task');
    await page.locator('select[id^="lane-"]').selectOption('done');
    await page.locator('details.track-add-task button[type="submit"]').click();

    const doneCard = page.locator('.card').filter({ has: page.locator('.card-title', { hasText: 'Completed task' }) }).first();
    await doneCard.locator('.card-toggle').click();
    await doneCard.locator('button.primary', { hasText: 'Mark complete' }).click();
    await acceptConfirmDialog(page);

    // Card leaves the Done lane
    const doneLane = page.locator('.lane').filter({ has: page.locator('h2', { hasText: 'Done' }) });
    await expect(doneLane.locator('.card-title', { hasText: 'Completed task' })).not.toBeVisible();
    // Brag file count shows at least 1
    await expect(page.locator('#unified-brag-count')).not.toBeEmpty();
  });

  // ── Tracks ─────────────────────────────────────────────────────────────────

  test('adds a new track and makes it selectable', async ({ page }) => {
    await page.locator('#new-track-name').fill('Sprint 2');
    await page.locator('#add-track').click();
    await expect(page.locator('#track-select option', { hasText: 'Sprint 2' })).toBeAttached();
  });

  test('switching track shows only that track\'s board', async ({ page }) => {
    // Add second track
    await page.locator('#new-track-name').fill('Track B');
    await page.locator('#add-track').click();
    // Add a card to Track B
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Track B card');
    await page.locator('details.track-add-task button[type="submit"]').click();

    // Switch back to My Project – Track B card should not be visible there
    await page.locator('#track-select').selectOption({ label: 'My Project' });
    await expect(page.locator('.card-title', { hasText: 'Track B card' })).not.toBeVisible();
  });

  // ── Reset board ────────────────────────────────────────────────────────────

  test('reset board removes all cards after confirmation', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Pre-reset card');
    await page.locator('details.track-add-task button[type="submit"]').click();
    await expect(page.locator('.card-title', { hasText: 'Pre-reset card' })).toBeVisible();

    await page.locator('#reset-board').click();
    await acceptConfirmDialog(page);

    await expect(page.locator('.card-title')).toHaveCount(1);
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('card title persists after page reload', async ({ page }) => {
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Persisted card');
    await page.locator('details.track-add-task button[type="submit"]').click();

    await gotoApp(page, 'kanban.html');
    await expect(page.locator('.card-title', { hasText: 'Persisted card' })).toBeVisible();
  });

  // ── Export / Import ────────────────────────────────────────────────────────

  test('export-all triggers a download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-all').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/kanban.*\.json/i);
  });

  test('import overwrites board state from a JSON file', async ({ page }) => {
    // Create a card first so we have something to overwrite
    await page.locator('details.track-add-task summary').click();
    await page.locator('input[id^="title-"]').fill('Original card');
    await page.locator('details.track-add-task button[type="submit"]').click();

    // Build a minimal valid kanban snapshot with different card text
    const snapshot = {
      activeTrackId: 'tid-test',
      visibleTrackIds: ['tid-test'],
      unifiedLane: 'doing',
      tracks: [
        {
          id: 'tid-test',
          name: 'Imported Track',
          cards: [
            {
              id: 'cid-test',
              title: 'Imported card',
              notes: '',
              lane: 'backlog',
              priority: 'medium',
              laneOrder: 0,
              createdAt: Date.now(),
            },
          ],
        },
      ],
      bragFile: [],
    };
    await page.locator('#import-file').setInputFiles({
      name: 'kanban.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    });

    await acceptConfirmDialog(page);
    await expect(page.locator('.card-title', { hasText: 'Imported card' })).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Original card' })).not.toBeVisible();
  });
});
