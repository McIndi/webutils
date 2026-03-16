const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, seedLocalStorage, acceptConfirmDialog } = require('./helpers/storage');

test.describe('static-page-generator', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'static-page-generator.html');
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('loads with page title, filename, theme select and CodeMirror editor', async ({ page }) => {
    await expect(page.locator('#page-title')).toBeVisible();
    await expect(page.locator('#file-name')).toBeVisible();
    await expect(page.locator('#theme-select')).toBeVisible();
    await expect(page.locator('.CodeMirror')).toBeVisible();
  });

  test('action buttons are visible', async ({ page }) => {
    await expect(page.locator('#download-html')).toBeVisible();
    await expect(page.locator('#copy-html')).toBeVisible();
    await expect(page.locator('#reset-draft')).toBeVisible();
  });

  test('preview iframe is present', async ({ page }) => {
    await expect(page.locator('#preview-frame')).toBeVisible();
  });

  test('TOC toggle checkbox is present', async ({ page }) => {
    await expect(page.locator('#toggle-toc')).toBeVisible();
  });

  // ── Page title and filename ────────────────────────────────────────────────

  test('editing the page title updates the field value', async ({ page }) => {
    await page.locator('#page-title').fill('My Cool Page');
    await expect(page.locator('#page-title')).toHaveValue('My Cool Page');
  });

  test('editing the filename updates the field value', async ({ page }) => {
    await page.locator('#file-name').fill('my-cool-page');
    await expect(page.locator('#file-name')).toHaveValue('my-cool-page');
  });

  // ── Theme selection ────────────────────────────────────────────────────────

  test('theme select has multiple options', async ({ page }) => {
    const options = await page.locator('#theme-select option').count();
    expect(options).toBeGreaterThan(1);
  });

  test('changing theme updates the theme description', async ({ page }) => {
    const select = page.locator('#theme-select');
    const firstOption = await select.locator('option').first().getAttribute('value');
    const options = await select.locator('option').all();

    // Find a different option
    let differentValue = null;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val !== firstOption) {
        differentValue = val;
        break;
      }
    }

    if (differentValue) {
      await select.selectOption(differentValue);
      const desc = await page.locator('#theme-description').textContent();
      expect(desc).toBeTruthy();
    }
  });

  // ── Reset draft ────────────────────────────────────────────────────────────

  test('reset draft shows confirmation dialog', async ({ page }) => {
    await page.locator('#reset-draft').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
  });

  test('confirming reset closes the confirmation dialog', async ({ page }) => {
    // First set custom content
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror;
      cm.setValue('Custom content here');
    });

    await page.locator('#reset-draft').click();
    await acceptConfirmDialog(page);

    await expect(page.locator('#confirm-dialog')).not.toBeVisible();
  });

  test('cancelling the reset dialog keeps the current content', async ({ page }) => {
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror;
      cm.setValue('Keep this content');
    });

    await page.locator('#reset-draft').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    // Click cancel (not the accept button)
    await page.locator('#confirm-dialog button:not(#confirm-accept)').click();

    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue();
    });
    expect(content).toBe('Keep this content');
  });

  // ── TOC toggle ─────────────────────────────────────────────────────────────

  test('toggling TOC checkbox changes its checked state', async ({ page }) => {
    const toc = page.locator('#toggle-toc');
    const initial = await toc.isChecked();
    await toc.click();
    expect(await toc.isChecked()).toBe(!initial);
  });

  // ── Download ───────────────────────────────────────────────────────────────

  test('clicking download triggers a file download', async ({ page }) => {
    await page.locator('#page-title').fill('Download Test');
    await page.locator('#file-name').fill('download-test');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-html').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.html$/);
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  test('page title and filename persist after reload', async ({ page }) => {
    await page.locator('#page-title').fill('Persisted Title');
    await page.locator('#file-name').fill('persisted-file');

    await gotoApp(page, 'static-page-generator.html');
    await expect(page.locator('#page-title')).toHaveValue('Persisted Title');
    await expect(page.locator('#file-name')).toHaveValue('persisted-file');
  });

  test('markdown content persists after reload', async ({ page }) => {
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror;
      cm.setValue('# Persisted Heading\nSome content');
    });
    // Trigger a save by changing the title (saveState should fire on input events)
    await page.locator('#page-title').fill('Save Trigger');

    await gotoApp(page, 'static-page-generator.html');
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue();
    });
    expect(content).toContain('Persisted Heading');
  });

  test('theme selection persists after reload', async ({ page }) => {
    const select = page.locator('#theme-select');
    const options = await select.locator('option').all();

    // Pick the last option (likely different from default)
    const lastValue = await options[options.length - 1].getAttribute('value');
    await select.selectOption(lastValue);

    await gotoApp(page, 'static-page-generator.html');
    await expect(page.locator('#theme-select')).toHaveValue(lastValue);
  });
});
