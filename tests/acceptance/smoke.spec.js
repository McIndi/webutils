const { test, expect } = require('@playwright/test');
const { KNOWN_APPS, gotoApp, clearWebUtilsStorage } = require('./helpers/storage');

const expectations = {
  'index.html': /WebUtils/i,
  'kanban.html': /Kanban/i,
  'zip-workbench.html': /ZIP Workbench|Zip Workbench/i,
  'repo2prompt.html': /Repo2Prompt/i,
  'regex-workbench.html': /Regex Workbench/i,
  'notes.html': /Notes Wiki/i,
  'static-page-generator.html': /Static Page Generator/i,
  'contentstudio.html': /Content Studio/i,
  'thegym.html': /TheGym/i,
};

test.describe('docs app smoke', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
  });

  for (const app of KNOWN_APPS) {
    test(`loads ${app}`, async ({ page }) => {
      await gotoApp(page, app);
      await expect(page).toHaveTitle(expectations[app]);
    });
  }
});
