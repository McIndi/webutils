const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

test.describe('regex-workbench', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'regex-workbench.html');
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('loads with pattern input, flag controls, and sample textarea', async ({ page }) => {
    await expect(page.locator('#pattern')).toBeVisible();
    await expect(page.locator('#flag-controls')).toBeVisible();
    await expect(page.locator('#sample-text')).toBeVisible();
    await expect(page.locator('#match-preview')).toBeAttached();
  });

  test('preset section is visible', async ({ page }) => {
    await expect(page.locator('#preset-name')).toBeVisible();
    await expect(page.locator('#save-preset')).toBeVisible();
    await expect(page.locator('#preset-list')).toBeVisible();
  });

  // ── Pattern matching ───────────────────────────────────────────────────────

  test('typing a valid pattern with sample text shows matches in preview', async ({ page }) => {
    await page.locator('#sample-text').fill('hello world hello');
    await page.locator('#pattern').fill('hello');
    await expect(page.locator('#match-preview')).not.toBeEmpty();
    await expect(page.locator('#regex-status')).not.toHaveClass(/error/);
  });

  test('an invalid regex pattern shows error status', async ({ page }) => {
    await page.locator('#pattern').fill('[invalid(');
    await expect(page.locator('#regex-status')).toHaveClass(/error/);
  });

  test('empty pattern does not show an error', async ({ page }) => {
    await page.locator('#pattern').fill('');
    await expect(page.locator('#regex-status')).not.toHaveClass(/error/);
  });

  // ── Flags ──────────────────────────────────────────────────────────────────

  test('toggling case-insensitive flag changes match result', async ({ page }) => {
    await page.locator('#sample-text').fill('Hello');
    await page.locator('#pattern').fill('hello');
    const flagI = page.locator('#flag-controls input[value="i"]');

    // Ensure case-insensitive is OFF first: "Hello" should not match "hello"
    if (await flagI.isChecked()) {
      await flagI.click();
    }
    await expect(page.locator('#match-count')).toHaveText('0');

    // Turn it ON and verify matches now appear
    await flagI.click();
    await expect(page.locator('#match-count')).toHaveText('1');
  });

  test('global flag checkbox is present', async ({ page }) => {
    await expect(page.locator('#flag-controls input[value="g"]')).toBeVisible();
  });

  // ── Presets ────────────────────────────────────────────────────────────────

  test('saving a preset adds it to the preset list', async ({ page }) => {
    await page.locator('#pattern').fill('\\d+');
    await page.locator('#preset-name').fill('Numbers');
    await page.locator('#save-preset').click();

    await expect(page.locator('#preset-list .preset-row', { hasText: 'Numbers' })).toBeVisible();
  });

  test('loading a preset restores the pattern', async ({ page }) => {
    await page.locator('#pattern').fill('\\w+');
    await page.locator('#preset-name').fill('Words');
    await page.locator('#save-preset').click();

    // Clear the pattern
    await page.locator('#pattern').fill('');

    // Load the preset
    await page.locator('#preset-list .preset-row', { hasText: 'Words' }).locator('button', { hasText: 'Load' }).click();
    await expect(page.locator('#pattern')).toHaveValue('\\w+');
  });

  test('deleting a preset shows confirmation and removes it', async ({ page }) => {
    await page.locator('#pattern').fill('\\s+');
    await page.locator('#preset-name').fill('Whitespace');
    await page.locator('#save-preset').click();

    await expect(page.locator('#preset-list .preset-row', { hasText: 'Whitespace' })).toBeVisible();

    await page.locator('#preset-list .preset-row', { hasText: 'Whitespace' }).locator('button', { hasText: 'Delete' }).click();
    await acceptConfirmDialog(page);

    await expect(page.locator('#preset-list .preset-row', { hasText: 'Whitespace' })).toHaveCount(0);
  });

  test('saving a preset with an empty name is prevented', async ({ page }) => {
    await page.locator('#pattern').fill('\\d+');
    await page.locator('#preset-name').fill('');
    await page.locator('#save-preset').click();

    // No preset row should be added with an empty name
    await expect(page.locator('#preset-list .preset-row')).toHaveCount(0);
  });

  test('multiple presets can coexist', async ({ page }) => {
    const presets = [
      { name: 'P1', pattern: '^start' },
      { name: 'P2', pattern: 'end$' },
      { name: 'P3', pattern: '\\b\\w{4}\\b' },
    ];

    for (const { name, pattern } of presets) {
      await page.locator('#pattern').fill(pattern);
      await page.locator('#preset-name').fill(name);
      await page.locator('#save-preset').click();
    }

    await expect(page.locator('#preset-list .preset-row')).toHaveCount(3);
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('current pattern and sample text persist after reload', async ({ page }) => {
    await page.locator('#sample-text').fill('persistent sample');
    await page.locator('#pattern').fill('persist');

    await gotoApp(page, 'regex-workbench.html');
    await expect(page.locator('#pattern')).toHaveValue('persist');
    await expect(page.locator('#sample-text')).toHaveValue('persistent sample');
  });

  test('saved presets persist after reload', async ({ page }) => {
    await page.locator('#pattern').fill('[a-z]+');
    await page.locator('#preset-name').fill('Lowercase');
    await page.locator('#save-preset').click();

    await gotoApp(page, 'regex-workbench.html');
    await expect(page.locator('#preset-list .preset-row', { hasText: 'Lowercase' })).toBeVisible();
  });

  test('seeded preset is loaded from localStorage', async ({ page }) => {
    await seedLocalStorage(page, 'webutils.regex-workbench.v1', {
      pattern: '^[A-Z]',
      flags: 'g',
      sample: 'Capital letters rock',
      presets: [
        { name: 'StartsCap', pattern: '^[A-Z]', flags: 'g' },
      ],
    });
    await gotoApp(page, 'regex-workbench.html');
    await expect(page.locator('#preset-list .preset-row', { hasText: 'StartsCap' })).toBeVisible();
  });
});
