const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptGymModal } = require('./helpers/storage');

test.describe('thegym', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'thegym.html');
  });

  // ── Seed data / initial state ──────────────────────────────────────────────

  test('loads with 5 seeded exercises on the dashboard', async ({ page }) => {
    await expect(page.locator('#stat-exercises')).toHaveText('5');
  });

  test('dashboard view is shown by default', async ({ page }) => {
    await expect(page.locator('.nav-tab[data-view="dashboard"]')).toHaveClass(/active/);
  });

  test('session count and rep count are present on dashboard', async ({ page }) => {
    await expect(page.locator('#stat-sessions')).toBeVisible();
    await expect(page.locator('#stat-reps')).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('clicking Exercises tab shows the exercise list', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await expect(page.locator('#view-exercises')).toBeVisible();
    await expect(page.locator('#exercise-list')).toBeVisible();
  });

  test('exercises tab shows 5 exercise rows', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await expect(page.locator('#exercise-list .exercise-row')).toHaveCount(5);
  });

  test('clicking Editor tab shows the editor form', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await expect(page.locator('#view-editor')).toBeVisible();
    await expect(page.locator('#edit-name')).toBeVisible();
    await expect(page.locator('#edit-type')).toBeVisible();
  });

  test('clicking Workout tab shows the workout view', async ({ page }) => {
    await page.locator('.nav-tab[data-view="workout"]').click();
    await expect(page.locator('#view-workout')).toBeVisible();
  });

  test('clicking Data tab shows data management view', async ({ page }) => {
    await page.locator('.nav-tab[data-view="data"]').click();
    await expect(page.locator('#view-data')).toBeVisible();
  });

  // ── Exercise filters ───────────────────────────────────────────────────────

  test('ALL filter button shows all 5 exercises', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#filter-all').click();
    await expect(page.locator('#exercise-list .exercise-row')).toHaveCount(5);
  });

  test('TRANSCRIPTION filter narrows exercise list', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#filter-transcription').click();
    const rows = page.locator('#exercise-list .exercise-row');
    await expect(rows).toHaveCount(1);
  });

  test('FLASHCARD filter narrows exercise list', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#filter-flashcard').click();
    await expect(page.locator('#exercise-list .exercise-row')).toHaveCount(2);
  });

  test('CIRCUIT filter shows only circuit exercises', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#filter-circuit').click();
    const rows = page.locator('#exercise-list .exercise-row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.tag')).toHaveText(/circuit/i);
    }
  });

  test('DEBUG filter shows only debug exercises', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#filter-debug').click();
    const rows = page.locator('#exercise-list .exercise-row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.tag')).toHaveText(/debug/i);
    }
  });

  // ── Create exercise ────────────────────────────────────────────────────────

  test('editor starts with delete button hidden for a new exercise', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await expect(page.locator('#btn-delete')).toHaveClass(/hidden/);
  });

  test('saving a new transcription exercise increments counting to 6', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await page.locator('#edit-type').selectOption('transcription');
    await page.locator('#edit-name').fill('New Transcription Exercise');
    await page.locator('button.primary', { hasText: 'SAVE EXERCISE' }).click();

    // Return to dashboard to check the count
    await page.locator('.nav-tab[data-view="dashboard"]').click();
    await expect(page.locator('#stat-exercises')).toHaveText('6');
  });

  test('saving a new flashcard exercise shows success message', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await page.locator('#edit-type').selectOption('flashcard');
    await page.locator('#edit-name').fill('What is a closure?');
    await page.locator('#edit-question').fill('What is a closure in JavaScript?');
    await page.locator('#edit-answer').fill('A function that retains access to its lexical scope.');
    await page.locator('button.primary', { hasText: 'SAVE EXERCISE' }).click();

    await expect(page.locator('#editor-msg')).not.toBeEmpty();
  });

  test('saving exercise with empty name is prevented', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await page.locator('#edit-name').fill('');
    await page.locator('button.primary', { hasText: 'SAVE EXERCISE' }).click();

    // Count should remain 5
    await page.locator('.nav-tab[data-view="dashboard"]').click();
    await expect(page.locator('#stat-exercises')).toHaveText('5');
  });

  test('tags can be set on an exercise', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await page.locator('#edit-type').selectOption('transcription');
    await page.locator('#edit-name').fill('Tagged Exercise');
    await page.locator('#edit-tags').fill('python, testing');
    await page.locator('button.primary', { hasText: 'SAVE EXERCISE' }).click();

    await expect(page.locator('#editor-msg')).not.toBeEmpty();
  });

  // ── Edit exercise ──────────────────────────────────────────────────────────

  test('clicking an exercise row starts workout view', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#exercise-list .exercise-row').first().click();

    await expect(page.locator('.nav-tab[data-view="workout"]')).toHaveClass(/active/);
  });

  // ── Delete exercise ────────────────────────────────────────────────────────

  test('deleting an exercise via confirm modal decrements the count', async ({ page }) => {
    // Open first exercise in editor using row action
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#exercise-list .exercise-row .row-actions button').first().click();
    await expect(page.locator('#view-editor')).toBeVisible();

    await page.locator('#btn-delete').click();
    await acceptGymModal(page);

    // Dashboard should now show 4
    await page.locator('.nav-tab[data-view="dashboard"]').click();
    await expect(page.locator('#stat-exercises')).toHaveText('4');
  });

  test('delete confirmation modal appears before deleting', async ({ page }) => {
    await page.locator('.nav-tab[data-view="exercises"]').click();
    await page.locator('#exercise-list .exercise-row .row-actions button').first().click();

    await page.locator('#btn-delete').click();
    await expect(page.locator('#modal')).toBeVisible();
  });

  // ── Workout view ───────────────────────────────────────────────────────────

  test('workout view shows progress label', async ({ page }) => {
    await page.locator('.nav-tab[data-view="workout"]').click();
    await expect(page.locator('#workout-progress-label')).toContainText(/Exercise\s+\d+\s+of\s+\d+/i);
  });

  test('transcription exercise shows text input area', async ({ page }) => {
    // Start a transcription exercise directly (click from exercises list)
    await page.locator('.nav-tab[data-view="exercises"]').click();

    // Find a transcription row and start it
    await page.locator('#filter-transcription').click();
    const firstRow = page.locator('#exercise-list .exercise-row').first();
    await firstRow.click();

    await expect(page.locator('#trans-input')).toBeVisible();
  });

  test('debug exercise shows WRONG LINE for incorrect click', async ({ page }) => {
    await page.locator('.nav-tab[data-view="workout"]').click();
    await page.getByRole('button', { name: 'DEBUG', exact: true }).click();

    await expect(page.locator('#ex-debug')).toBeVisible();
    await page.locator('#debug-code .debug-code-line[data-line="1"]').click();

    await expect(page.locator('#debug-result')).toContainText(/WRONG LINE/i);
  });

  test('debug exercise shows CORRECT LINE for expected click', async ({ page }) => {
    await page.locator('.nav-tab[data-view="workout"]').click();
    await page.getByRole('button', { name: 'DEBUG', exact: true }).click();

    await expect(page.locator('#ex-debug')).toBeVisible();
    await page.locator('#debug-code .debug-code-line[data-line="2"]').click();

    await expect(page.locator('#debug-result')).toContainText(/CORRECT LINE/i);
  });

  test('debug first click is final and ignores later clicks', async ({ page }) => {
    await page.locator('.nav-tab[data-view="workout"]').click();
    await page.getByRole('button', { name: 'DEBUG', exact: true }).click();

    await expect(page.locator('#ex-debug')).toBeVisible();
    await page.locator('#debug-code .debug-code-line[data-line="1"]').click();
    await expect(page.locator('#debug-result')).toContainText(/WRONG LINE/i);

    const selectedBefore = page.locator('#debug-code .debug-code-line.selected');
    await expect(selectedBefore).toHaveAttribute('data-line', '1');
    await expect(page.locator('#debug-code')).toHaveClass(/locked/);
    await expect(page.locator('#debug-code .debug-code-line[data-line="2"]')).toBeDisabled();
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('new exercise persists after reload', async ({ page }) => {
    await page.locator('.nav-tab[data-view="editor"]').click();
    await page.locator('#edit-type').selectOption('transcription');
    await page.locator('#edit-name').fill('Persist Test Exercise');
    await page.locator('button.primary', { hasText: 'SAVE EXERCISE' }).click();

    await gotoApp(page, 'thegym.html');
    await expect(page.locator('#stat-exercises')).toHaveText('6');
  });
});
