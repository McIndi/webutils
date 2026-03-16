const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage } = require('./helpers/storage');

test.describe('personalized acceptance starters', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
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
