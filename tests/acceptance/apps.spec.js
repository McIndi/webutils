const { test, expect } = require('@playwright/test');
const { KNOWN_APPS, gotoApp, clearWebUtilsStorage } = require('./helpers/storage');

test.describe('personalized acceptance starters', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
  });

  test('every page opens the command palette with Ctrl+K', async ({ page }) => {
    for (const fileName of KNOWN_APPS) {
      await gotoApp(page, fileName);
      await page.keyboard.press('Control+k');
      await expect(page.locator('#command-palette'), `palette on ${fileName}`).toBeVisible();
      await expect(
        page.locator('#command-palette-list li').first(),
        `palette commands on ${fileName}`
      ).toBeVisible();

      // ArrowDown must produce a visibly-highlighted selection (not just an
      // aria change) — guards against a page missing the selected-row CSS var.
      await page.keyboard.press('ArrowDown');
      const selectionVisible = await page.evaluate(() => {
        const list = document.getElementById('command-palette-list');
        const sel = list.querySelector('li[aria-selected="true"] button');
        const unsel = list.querySelector('li[aria-selected="false"] button');
        if (!sel || !unsel) return true; // <2 commands: nothing to distinguish
        return getComputedStyle(sel).backgroundColor !== getComputedStyle(unsel).backgroundColor;
      });
      expect(selectionVisible, `selection highlight visible on ${fileName}`).toBe(true);

      await page.keyboard.press('Escape');
      await expect(page.locator('#command-palette')).toBeHidden();

      // Mobile path: the shortcut-note button must open the same palette.
      await page.locator('[data-open-command-palette]').click();
      await expect(page.locator('#command-palette'), `palette button on ${fileName}`).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#command-palette')).toBeHidden();
    }
  });

  test('index: shows utilities and data controls', async ({ page }) => {
    await gotoApp(page, 'index.html');
    await expect(page.getByRole('heading', { name: 'Utilities', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data controls', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'TheGym', exact: true })).toBeVisible();
  });

  test('kanban: core lanes render', async ({ page }) => {
    await gotoApp(page, 'kanban.html');
    await expect(page.getByRole('heading', { name: /Kanban Task Board/i })).toBeVisible();
    await expect(page.locator('.lane h2', { hasText: 'Backlog' }).first()).toBeVisible();
    await expect(page.locator('.lane h2', { hasText: 'Doing' }).first()).toBeVisible();
    await expect(page.locator('.lane h2', { hasText: 'Review' }).first()).toBeVisible();
    await expect(page.locator('.lane h2', { hasText: 'Done' }).first()).toBeVisible();
  });

  test('zip-workbench: upload controls and editor area render', async ({ page }) => {
    await gotoApp(page, 'zip-workbench.html');
    await expect(page.getByText(/Zip Workbench|ZIP Workbench/i).first()).toBeVisible();
    await expect(page.locator('label[for="zip-input"]')).toBeVisible();
    await expect(page.locator('#zip-input')).toHaveCount(1);
    await expect(page.locator('#editor-area')).toContainText(/Select a file to edit/i);
  });

  test('repo2prompt: url load flow controls render', async ({ page }) => {
    await gotoApp(page, 'repo2prompt.html');
    await expect(page.getByRole('heading', { name: /Repo2Prompt/i })).toBeVisible();
    await expect(page.locator('#zip-url')).toBeVisible();
    await expect(page.locator('#load-zip')).toBeVisible();
    await expect(page.locator('#output')).toBeVisible();
  });

  test('regex-workbench: invalid regex path shows error', async ({ page }) => {
    await gotoApp(page, 'regex-workbench.html');
    await page.fill('#pattern', '[');
    await expect(page.locator('#regex-status')).toContainText(/Regex error/i);
  });

  test('notes: list and export controls render', async ({ page }) => {
    await gotoApp(page, 'notes.html');
    await expect(page.getByRole('heading', { name: /Notes Wiki/i })).toBeVisible();
    await expect(page.locator('#export-notes')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('static-page-generator: draft + preview controls render', async ({ page }) => {
    await gotoApp(page, 'static-page-generator.html');
    await expect(page.getByText(/Static Page Generator/i).first()).toBeVisible();
    await expect(page.locator('#editor-resize')).toBeVisible();
    await expect(page.locator('#preview-frame')).toBeVisible();
  });

  test('contentstudio: new project dialog can open', async ({ page }) => {
    await gotoApp(page, 'contentstudio.html');
    await expect(page.getByText(/Content Studio/i).first()).toBeVisible();
    await page.locator('#btn-new-project').click();
    await expect(page.locator('#project-dialog')).toBeVisible();
  });

  test('thegym: exercise row starts workout directly', async ({ page }) => {
    await gotoApp(page, 'thegym.html');
    await page.getByText('Exercises').first().click();
    const firstRow = page.locator('#exercise-list .exercise-row').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await expect(page.locator('#workout-progress-label')).toContainText(/Exercise 1 of/i);
  });
});
