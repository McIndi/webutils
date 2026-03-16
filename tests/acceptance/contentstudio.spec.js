const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

test.describe('contentstudio', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'contentstudio.html');
  });

  // ── Seed data / initial state ──────────────────────────────────────────────

  test('loads with default seed: 1 project, 1 asset, 3 platforms, 0 log entries', async ({ page }) => {
    await expect(page.locator('#count-projects')).toHaveText('1');
    await expect(page.locator('#count-assets')).toHaveText('1');
    await expect(page.locator('#count-platforms')).toHaveText('3');
    await expect(page.locator('#count-log')).toHaveText('0');
  });

  test('projects tab is active by default and shows the default project', async ({ page }) => {
    await expect(page.locator('.nav-tab[data-view="projects"]')).toHaveClass(/active/);
    await expect(page.locator('#view-projects')).toBeVisible();
  });

  // ── Navigation tabs ────────────────────────────────────────────────────────

  test('clicking assets tab shows asset content', async ({ page }) => {
    await page.locator('.nav-tab[data-view="assets"]').click();
    await expect(page.locator('#view-assets')).toBeVisible();
    await expect(page.locator('#view-projects')).not.toHaveClass(/active/);
  });

  test('clicking platforms tab shows platforms content', async ({ page }) => {
    await page.locator('.nav-tab[data-view="platforms"]').click();
    await expect(page.locator('#view-platforms')).toBeVisible();
  });

  test('clicking draft tab shows draft textarea area', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await expect(page.locator('#view-draft')).toBeVisible();
  });

  test('clicking log tab shows log content', async ({ page }) => {
    await page.locator('.nav-tab[data-view="log"]').click();
    await expect(page.locator('#view-log')).toBeVisible();
  });

  // ── Create project ─────────────────────────────────────────────────────────

  test('new project dialog opens on button click', async ({ page }) => {
    await page.locator('#btn-new-project').click();
    await expect(page.locator('#project-dialog')).toBeVisible();
  });

  test('creating a project increments the count and closes dialog', async ({ page }) => {
    await page.locator('#btn-new-project').click();
    await page.locator('#proj-name').fill('Test Project');
    await page.locator('#btn-save-project').click();

    await expect(page.locator('#project-dialog')).not.toBeVisible();
    await expect(page.locator('#count-projects')).toHaveText('2');
  });

  test('saving a project with an empty name is rejected', async ({ page }) => {
    await page.locator('#btn-new-project').click();
    await page.locator('#btn-save-project').click();
    // Dialog should remain open (no save with empty name)
    await expect(page.locator('#project-dialog')).toBeVisible();
  });

  test('project dialog can be closed without saving', async ({ page }) => {
    await page.locator('#btn-new-project').click();
    await page.locator('#proj-name').fill('Unsaved Project');
    await page.locator('button[data-close="project-dialog"]').first().click();
    await expect(page.locator('#project-dialog')).not.toBeVisible();
    await expect(page.locator('#count-projects')).toHaveText('1');
  });

  // ── Create asset ───────────────────────────────────────────────────────────

  test('new asset dialog opens on button click', async ({ page }) => {
    await page.locator('.nav-tab[data-view="assets"]').click();
    await page.locator('#btn-new-asset').click();
    await expect(page.locator('#asset-dialog')).toBeVisible();
  });

  test('creating an asset increments the count', async ({ page }) => {
    await page.locator('.nav-tab[data-view="assets"]').click();
    await page.locator('#btn-new-asset').click();

    // Select the first project in the project dropdown
    const projectOptions = await page.locator('#asset-project-select option').all();
    if (projectOptions.length > 1) {
      const firstRealVal = await projectOptions[1].getAttribute('value');
      if (firstRealVal) await page.locator('#asset-project-select').selectOption(firstRealVal);
    }

    await page.locator('#asset-content').fill('Asset content text');
    await page.locator('#btn-save-asset').click();

    await expect(page.locator('#asset-dialog')).not.toBeVisible();
    await expect(page.locator('#count-assets')).toHaveText('2');
  });

  // ── Create platform ────────────────────────────────────────────────────────

  test('new platform dialog opens on button click', async ({ page }) => {
    await page.locator('.nav-tab[data-view="platforms"]').click();
    await page.locator('#btn-new-platform').click();
    await expect(page.locator('#platform-dialog')).toBeVisible();
  });

  test('creating a platform increments the count', async ({ page }) => {
    await page.locator('.nav-tab[data-view="platforms"]').click();
    await page.locator('#btn-new-platform').click();
    await page.locator('#plat-name').fill('Twitter');
    await page.locator('#btn-save-platform').click();

    await expect(page.locator('#platform-dialog')).not.toBeVisible();
    await expect(page.locator('#count-platforms')).toHaveText('4');
  });

  test('saving a platform with empty name is rejected', async ({ page }) => {
    await page.locator('.nav-tab[data-view="platforms"]').click();
    await page.locator('#btn-new-platform').click();
    await page.locator('#btn-save-platform').click();
    await expect(page.locator('#platform-dialog')).toBeVisible();
  });

  // ── Draft ──────────────────────────────────────────────────────────────────

  test('draft tab shows project and platform selects', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await expect(page.locator('#draft-project-select')).toBeVisible();
    await expect(page.locator('#draft-platform-select')).toBeVisible();
  });

  test('draft char counter is visible', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await expect(page.locator('#char-counter')).toBeVisible();
  });

  test('log publication button is visible in draft tab', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await expect(page.locator('#btn-log-publication')).toBeVisible();
  });

  // ── Log publication ────────────────────────────────────────────────────────

  test('log publication dialog opens', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await page.locator('#btn-log-publication').click();
    await expect(page.locator('#log-dialog')).toBeVisible();
  });

  test('logging a publication increments the log count', async ({ page }) => {
    await page.locator('.nav-tab[data-view="draft"]').click();
    await page.locator('#btn-log-publication').click();

    await page.locator('#log-title').fill('Weekly project update');

    const projectOptions = await page.locator('#log-proj-select option').all();
    if (projectOptions.length > 1) {
      const projVal = await projectOptions[1].getAttribute('value');
      if (projVal) await page.locator('#log-proj-select').selectOption(projVal);
    }

    const platformOptions = await page.locator('#log-plat-select option').all();
    if (platformOptions.length > 1) {
      const platVal = await platformOptions[1].getAttribute('value');
      if (platVal) await page.locator('#log-plat-select').selectOption(platVal);
    }

    await page.locator('#btn-save-log').click();
    await expect(page.locator('#count-log')).toHaveText('1');
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('created project persists after reload', async ({ page }) => {
    await page.locator('#btn-new-project').click();
    await page.locator('#proj-name').fill('Persisted Project');
    await page.locator('#btn-save-project').click();

    await gotoApp(page, 'contentstudio.html');
    await expect(page.locator('#count-projects')).toHaveText('2');
  });

  test('seed data on fresh load is always consistent', async ({ page }) => {
    // Clear storage and reload to re-seed
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'contentstudio.html');

    await expect(page.locator('#count-projects')).toHaveText('1');
    await expect(page.locator('#count-platforms')).toHaveText('3');
  });
});
