const { expect } = require('@playwright/test');

const KNOWN_APPS = [
  'index.html',
  'kanban.html',
  'zip-workbench.html',
  'repo2prompt.html',
  'regex-workbench.html',
  'notes.html',
  'static-page-generator.html',
  'contentstudio.html',
  'thegym.html',
  'secret-share.html',
];

async function gotoApp(page, fileName) {
  await page.goto(`/docs/${fileName}`);
  await expect(page).toHaveURL(new RegExp(`/docs/${fileName.replace('.', '\\.')}$`));
}

async function clearWebUtilsStorage(page) {
  await page.goto('/docs/index.html');

  await page.evaluate(async () => {
    const shouldRemove = (key) =>
      key.startsWith('webutils.') ||
      key === 'thegym_exercises' ||
      key === 'thegym_sessions' ||
      key === 'thegym_pbs';

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (shouldRemove(key)) localStorage.removeItem(key);
    });

    const dbNames = ['webutils-storage-v1'];
    await Promise.all(
      dbNames.map(
        (name) =>
          new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          })
      )
    );
  });
}

/**
 * Seed a localStorage key with a JSON-serialisable value while on any page.
 * Must be called after navigating to the origin (e.g. after clearWebUtilsStorage).
 */
async function seedLocalStorage(page, key, value) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, JSON.stringify(v)),
    [key, value],
  );
}

/**
 * Seed an app-specific state payload that contains linkable entities.
 */
async function seedEntities(page, appKey, state) {
  await seedLocalStorage(page, appKey, state);
}

function deepLink(type, id) {
  return `#wu=${type}/${encodeURIComponent(id)}`;
}

/**
 * Accept the standard WebUtils confirm dialog (shared across apps that use it).
 * Clicks the #confirm-accept button inside #confirm-dialog.
 */
async function acceptConfirmDialog(page) {
  const dialog = page.locator('#confirm-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#confirm-accept').click();
}

/**
 * Accept the TheGym custom modal overlay (#modal).
 */
async function acceptGymModal(page) {
  const modal = page.locator('#modal');
  await expect(modal).toBeVisible();
  await modal.locator('#modal-confirm').click();
}

async function openPalette(page) {
  await page.keyboard.press('Control+k');
  await expect(page.locator('#command-palette')).toBeVisible();
}

module.exports = {
  KNOWN_APPS,
  gotoApp,
  clearWebUtilsStorage,
  seedLocalStorage,
  seedEntities,
  deepLink,
  acceptConfirmDialog,
  acceptGymModal,
  openPalette,
};
