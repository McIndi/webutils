const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

const BASE = 'http://127.0.0.1:4173';

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
    // APP_REGISTRY has 8 entries
    await expect(page.locator('#app-list .app-row')).toHaveCount(8);
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
});
