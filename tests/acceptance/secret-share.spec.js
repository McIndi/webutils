const { test, expect } = require('@playwright/test');
const { gotoApp, clearWebUtilsStorage, acceptConfirmDialog } = require('./helpers/storage');

async function setPassphrase(page, passphrase) {
  const dialog = page.locator('#passphrase-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#passphrase-input').fill(passphrase);
  await dialog.locator('#passphrase-confirm-input').fill(passphrase);
  await dialog.locator('#passphrase-accept').click();
}

async function unlockPassphrase(page, passphrase) {
  const dialog = page.locator('#passphrase-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#passphrase-input').fill(passphrase);
  await dialog.locator('#passphrase-accept').click();
}

// Encrypting now signs the message, which prompts the sender to unlock
// their own keypair with their passphrase.
async function encryptSecret(page, passphrase) {
  await page.locator('#encrypt-secret').click();
  await unlockPassphrase(page, passphrase);
  await expect(page.locator('#encrypted-link-box')).toBeVisible();
  return page.locator('#encrypted-link-output').inputValue();
}

test.describe('secret-share', () => {
  test.beforeEach(async ({ page }) => {
    await clearWebUtilsStorage(page);
    await gotoApp(page, 'secret-share.html');
  });

  test('loads with only the generate-keypair control visible', async ({ page }) => {
    await expect(page.locator('#generate-keypair')).toBeVisible();
    await expect(page.locator('#has-keypair-view')).toBeHidden();
    await expect(page.locator('#send-panel')).toBeHidden();
    await expect(page.locator('#decrypt-panel')).toBeHidden();
  });

  test('generating a keypair requires a passphrase of at least 12 characters', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    const dialog = page.locator('#passphrase-dialog');
    await dialog.locator('#passphrase-input').fill('short');
    await dialog.locator('#passphrase-confirm-input').fill('short');
    await dialog.locator('#passphrase-accept').click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('#passphrase-error')).toHaveText(/at least 12 characters/);
  });

  test('generating a keypair requires matching confirmation', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    const dialog = page.locator('#passphrase-dialog');
    await dialog.locator('#passphrase-input').fill('correct-horse');
    await dialog.locator('#passphrase-confirm-input').fill('different');
    await dialog.locator('#passphrase-accept').click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('#passphrase-error')).toHaveText(/do not match/);
  });

  test('generating a keypair shows a fingerprint and persists to storage', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');

    await expect(page.locator('#has-keypair-view')).toBeVisible();
    await expect(page.locator('#fingerprint-display')).not.toBeEmpty();

    const stored = await page.evaluate(() => localStorage.getItem('webutils.secret-share.v1'));
    expect(stored).toBeTruthy();
    const record = JSON.parse(stored);
    expect(record.encryptPublicKeyJwk).toBeTruthy();
    expect(record.wrappedEncryptPrivateKey).toBeTruthy();
    expect(record.signPublicKeyJwk).toBeTruthy();
    expect(record.wrappedSignPrivateKey).toBeTruthy();
  });

  test('keypair and fingerprint persist after reload', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');
    await expect(page.locator('#has-keypair-view')).toBeVisible();
    const fingerprint = await page.locator('#fingerprint-display').textContent();

    await gotoApp(page, 'secret-share.html');
    await expect(page.locator('#has-keypair-view')).toBeVisible();
    await expect(page.locator('#fingerprint-display')).toHaveText(fingerprint);
  });

  test('copy share link produces a link containing a #pub= fragment', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');

    await page.locator('#copy-share-link').click();
    await expect(page.locator('#share-link-box')).toBeVisible();
    const link = await page.locator('#share-link-output').inputValue();
    expect(link).toContain('secret-share.html#pub=');
  });

  test('removing a keypair requires confirmation and clears storage', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');

    await page.locator('#remove-keypair').click();
    await acceptConfirmDialog(page);

    await expect(page.locator('#generate-keypair')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('webutils.secret-share.v1'));
    expect(stored).toBeNull();
  });

  test('full round trip: share link, encrypt as recipient, decrypt back', async ({ page }) => {
    // Receiver generates a keypair and gets a share link.
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');
    await page.locator('#copy-share-link').click();
    const shareLink = await page.locator('#share-link-output').inputValue();

    // Sender opens the share link and encrypts a secret.
    await page.goto(shareLink);
    await expect(page.locator('#send-panel')).toBeVisible();
    await expect(page.locator('#send-fingerprint')).not.toBeEmpty();

    await page.locator('#plaintext-input').fill('the launch codes are 12345');
    const encryptedLink = await encryptSecret(page, 'correct-horse-battery');
    expect(encryptedLink).toContain('secret-share.html#msg=');

    // Receiver opens the encrypted link and decrypts it with their passphrase.
    await page.goto(encryptedLink);
    await expect(page.locator('#decrypt-panel')).toBeVisible();
    await page.locator('#decrypt-secret').click();
    await unlockPassphrase(page, 'correct-horse-battery');

    await expect(page.locator('#plaintext-box')).toBeVisible();
    await expect(page.locator('#plaintext-output')).toHaveValue('the launch codes are 12345');
  });

  test('decrypting with the wrong passphrase shows an error', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');
    await page.locator('#copy-share-link').click();
    const shareLink = await page.locator('#share-link-output').inputValue();

    await page.goto(shareLink);
    await page.locator('#plaintext-input').fill('top secret');
    const encryptedLink = await encryptSecret(page, 'correct-horse-battery');

    await page.goto(encryptedLink);
    await page.locator('#decrypt-secret').click();
    await unlockPassphrase(page, 'wrong-passphrase');

    await expect(page.locator('#decrypt-status')).toHaveClass(/error/);
    await expect(page.locator('#plaintext-box')).toBeHidden();
  });

  test('clear link from address bar removes the hash', async ({ page }) => {
    await page.locator('#generate-keypair').click();
    await setPassphrase(page, 'correct-horse-battery');
    await page.locator('#copy-share-link').click();
    const shareLink = await page.locator('#share-link-output').inputValue();

    await page.goto(shareLink);
    await page.locator('#plaintext-input').fill('clear me');
    const encryptedLink = await encryptSecret(page, 'correct-horse-battery');

    await page.goto(encryptedLink);
    await page.locator('#decrypt-secret').click();
    await unlockPassphrase(page, 'correct-horse-battery');
    await page.locator('#clear-link').click();

    await expect(page).toHaveURL(/secret-share\.html$/);
  });
});
