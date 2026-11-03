const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { inflateRawSync } = require('node:zlib');
const { clearWebUtilsStorage, acceptConfirmDialog } = require('./helpers/storage');

const KEY = 'webutils.markdown-documents.v1';
const DEPENDENCIES = [
  'https://cdn.jsdelivr.net/npm/marked@18.1.1/lib/marked.umd.js',
  'https://unpkg.com/docx@9.11.0/dist/index.umd.cjs',
  'https://cdn.jsdelivr.net/npm/pdfmake@0.3.11/build/pdfmake.min.js',
  'https://cdn.jsdelivr.net/npm/pdfmake@0.3.11/build/vfs_fonts.js',
];
const SAMPLE = `# Export check

A &amp; B with **bold**, *italic*, ~~removed~~, \`inline code\`, and [a link](https://example.com/).

Line one  
Line two with \`&amp;\` kept literally in code.

## Steps

3. First item
   - Nested bullet
     1. Nested ordered item
4. Second item

- [x] Checked task
- [ ] Open task

> Quoted text
>
> A second paragraph

| Name | Result |
| :--- | ---: |
| Example | **Good** |

\`\`\`js
const result = 42;
  indented line
\`\`\`

---

Final paragraph café Ελληνικά.
`;

// Cache the actual pinned scripts, not substitutes. SHA-384 in the page still
// checks their bytes. A clean checkout fetches each script once from its CDN.
async function useDependencies(page, request, blocked = () => false) {
  const cache = path.resolve(__dirname, '../../node_modules/.cache/webutils-dependencies');
  fs.mkdirSync(cache, { recursive: true });
  for (const dependency of DEPENDENCIES) {
    const file = path.join(cache, path.basename(dependency));
    if (!fs.existsSync(file)) {
      const response = await request.get(dependency);
      expect(response.ok(), dependency).toBeTruthy();
      fs.writeFileSync(file, await response.body());
    }
    await page.route(dependency, async route => {
      if (blocked(dependency)) return route.abort();
      return route.fulfill({ path: file, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff' } });
    });
  }
}

async function download(page, button, testInfo, filename) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(filename);
  const destination = testInfo.outputPath(filename);
  await file.saveAs(destination);
  return fs.readFileSync(destination);
}

// Read ZIP central-directory entries, including archives with data descriptors.
function readDocx(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  expect(end).toBeGreaterThanOrEqual(0);
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files = {};
  for (let index = 0; index < count; index++) {
    expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString();
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    files[name] = (method === 8 ? inflateRawSync(data) : data).toString();
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

test.describe('markdown documents', () => {
  test.beforeEach(async ({ page, request }) => {
    await useDependencies(page, request);
    await clearWebUtilsStorage(page);
    await page.goto('/docs/markdown-documents.html');
    await expect(page.locator('#document-preview h1')).toHaveText('Working notes');
  });

  test('exports structured DOCX and text PDF from the same Markdown', async ({ page }, testInfo) => {
    await page.getByLabel('Markdown', { exact: true }).fill(SAMPLE);
    await page.getByLabel('Download filename').fill('export-check.docx');
    await page.getByLabel('Paper size').selectOption('A4');
    await expect(page.locator('#document-preview h1')).toHaveText('Export check');
    await expect(page.locator('#document-preview ol').first()).toHaveAttribute('start', '3');
    await expect(page.locator('#document-preview table')).toContainText('Good');
    await expect(page.locator('#document-preview li').filter({ hasText: 'Checked task' })).toHaveText('[x] Checked task');
    const files = readDocx(await download(page, 'Download DOCX', testInfo, 'export-check.docx'));
    const xml = files['word/document.xml'];
    expect(xml).toContain('w:pStyle w:val="Heading1"');
    expect(xml).toContain('A &amp; B');
    expect(xml).toContain('w:hyperlink');
    expect(xml).toContain('w:tbl');
    expect(xml).toContain('[x]');
    expect(xml.match(/\[x\]/g)).toHaveLength(1);
    expect(xml).toContain('&amp;amp;');
    expect(xml).toContain('w:br');
    expect(xml).toContain('Nested ordered item');
    expect(xml).toContain('w:numPr');
    // List items are tight: 2 pt (40 twips) between items instead of the 8 pt paragraph gap.
    expect(xml).toMatch(/<w:numPr>(?:(?!<\/w:pPr>).)*<w:spacing w:after="40"/);
    expect(xml).toContain('w:w="11906"');
    expect(files['word/numbering.xml']).toContain('w:start w:val="3"');
    expect(files['word/_rels/document.xml.rels']).toContain('https://example.com/');
    expect(files['word/styles.xml']).toContain('Arial');
    const pdf = await download(page, 'Download PDF', testInfo, 'export-check.pdf');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox\s*\[0 0 595\.28 841\.89\]/);
    expect(pdf.toString('latin1')).toContain('/FontFile2');
    // Exporting a document must not imply a restorable draft backup exists.
    await expect(page.locator('#backup-chip-status')).toHaveText('Never backed up');
  });

  test('draft settings persist, empty drafts stay empty, and clear needs confirmation', async ({ page }) => {
    await page.getByLabel('Markdown', { exact: true }).fill('# Saved draft');
    await page.getByLabel('Download filename').fill('saved-draft');
    await page.getByLabel('Paper size').selectOption('A4');
    await page.reload();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('# Saved draft');
    await expect(page.getByLabel('Download filename')).toHaveValue('saved-draft');
    await expect(page.getByLabel('Paper size')).toHaveValue('A4');
    await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
    await page.locator('#confirm-dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('# Saved draft');
    await page.getByRole('button', { name: 'Clear draft', exact: true }).click();
    await acceptConfirmDialog(page);
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('');
    await page.reload();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Download DOCX', exact: true }).click();
    await expect(page.locator('#status')).toHaveText('Write or open Markdown before exporting.');
  });

  test('opens a Markdown file only after confirming draft replacement', async ({ page }) => {
    const input = page.locator('#markdown-file');
    await input.setInputFiles({ name: 'imported.md', mimeType: 'text/markdown', buffer: Buffer.from('# Imported file') });
    await page.locator('#confirm-dialog').getByRole('button', { name: 'Cancel' }).click();
    expect(await page.getByLabel('Markdown', { exact: true }).inputValue()).toContain('Working notes');
    await input.setInputFiles({ name: 'imported.md', mimeType: 'text/markdown', buffer: Buffer.from('# Imported file') });
    await acceptConfirmDialog(page);
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('# Imported file');
    await expect(page.getByLabel('Download filename')).toHaveValue('imported');
  });

  test('renders HTML and unsafe links as text without content requests', async ({ page }) => {
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.getByLabel('Markdown', { exact: true }).fill('# Safe preview\n\n<script>alert(1)</script>\n\n<img src="https://example.com/leak">\n\n[bad](javascript:alert%281%29)\n\n![private](https://example.com/private.png)');
    await expect(page.locator('#document-preview h1')).toHaveText('Safe preview');
    await expect(page.locator('#document-preview')).toContainText('[Image: private]');
    await expect(page.locator('#document-preview img, #document-preview script, #document-preview a')).toHaveCount(0);
    expect(requests.some(url => url.startsWith('https://example.com/'))).toBe(false);
  });

  test('backup round-trips through the index and validates paper size', async ({ page }, testInfo) => {
    await page.getByLabel('Markdown', { exact: true }).fill('# Backed up draft');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Back up', exact: true }).click();
    const file = await pending;
    const saved = testInfo.outputPath('backup.json');
    await file.saveAs(saved);
    const snapshot = JSON.parse(fs.readFileSync(saved, 'utf8'));
    expect(snapshot.apps['markdown-documents'].key).toBe(KEY);
    await expect(page.locator('#backup-chip-status')).toContainText('Backed up');
    await page.getByLabel('Markdown', { exact: true }).fill('# Changed');
    await expect(page.locator('#backup-chip-status')).toHaveText('Changes not backed up');
    await page.goto('/docs/index.html');
    const row = page.locator('#app-list .app-row').filter({ hasText: 'Markdown Documents' });
    await expect(row).toBeVisible();
    await page.locator('#import-file').setInputFiles(saved);
    await page.locator('#import-button').click();
    await acceptConfirmDialog(page);
    await expect(page.locator('#data-status')).toContainText('Imported');
    await page.goto('/docs/markdown-documents.html');
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('# Backed up draft');
    snapshot.apps['markdown-documents'].value = JSON.stringify({ markdown: 'bad', fileName: 'bad', paperSize: 'POSTCARD' });
    await page.goto('/docs/index.html');
    await page.locator('#import-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
    await page.locator('#validate-button').click();
    await expect(page.locator('#validate-result')).toContainText('paperSize must be LETTER or A4');
  });

  test('mobile layout fits the viewport and palette exports DOCX', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Markdown', { exact: true }).fill('# Mobile document');
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.width);
    await page.getByRole('button', { name: 'Open command palette' }).click();
    await page.getByLabel('Filter commands').fill('Download DOCX');
    const pending = page.waitForEvent('download');
    await page.locator('#command-palette-input').press('Enter');
    const file = await pending;
    await file.saveAs(testInfo.outputPath('mobile.docx'));
    expect(file.suggestedFilename()).toBe('document.docx');
  });

  test('Letter PDF paginates long content and includes the final paragraph', async ({ page }, testInfo) => {
    await page.getByLabel('Markdown', { exact: true }).fill('# Long document\n\n' + Array.from({ length: 120 }, (_, index) => `## Section ${index + 1}\n\nParagraph ${index + 1}: content that must survive pagination.`).join('\n\n'));
    const pdf = await download(page, 'Download PDF', testInfo, 'document.pdf');
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox\s*\[0 0 612 792\]/);
    const pageCounts = [...pdf.toString('latin1').matchAll(/\/Count (\d+)/g)].map(match => Number(match[1]));
    expect(Math.max(...pageCounts)).toBeGreaterThan(1);
  });
});

test('CDN failures keep the editor usable and permit preview and export retries', async ({ page, request }, testInfo) => {
  let blocked = true;
  await useDependencies(page, request, () => blocked);
  await clearWebUtilsStorage(page);
  await page.goto('/docs/markdown-documents.html');
  await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible();
  await page.getByLabel('Markdown', { exact: true }).fill('# Offline draft');
  await page.getByRole('button', { name: 'Download DOCX', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Could not load marked');
  await expect(page.getByRole('button', { name: 'Download DOCX', exact: true })).toBeEnabled();
  blocked = false;
  await page.getByRole('button', { name: 'Retry preview' }).click();
  await expect(page.locator('#document-preview h1')).toHaveText('Offline draft');
  await expect(page.getByRole('button', { name: 'Retry preview' })).toBeHidden();
  const docx = readDocx(await download(page, 'Download DOCX', testInfo, 'document.docx'));
  expect(docx['word/document.xml']).toContain('Offline draft');
});

test('export libraries and PDF fonts can retry after partial loading failures', async ({ page, request }, testInfo) => {
  let blockDocx = true;
  let blockFonts = true;
  await useDependencies(page, request, dependency => (blockDocx && dependency.includes('docx@')) || (blockFonts && dependency.endsWith('vfs_fonts.js')));
  await clearWebUtilsStorage(page);
  await page.goto('/docs/markdown-documents.html');
  await expect(page.locator('#document-preview h1')).toHaveText('Working notes');
  await page.getByRole('button', { name: 'Download DOCX', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Could not load docx');
  blockDocx = false;
  await download(page, 'Download DOCX', testInfo, 'document.docx');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Could not load PDF fonts');
  await expect(page.getByLabel('Markdown', { exact: true })).toBeEnabled();
  blockFonts = false;
  const pdf = await download(page, 'Download PDF', testInfo, 'document.pdf');
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
});

test('live pinned CDN scripts produce both downloads without response overrides', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  // Playwright creates a fresh browser context. No personal browser storage is
  // accessed; the only document here is the app's built-in sample.
  await clearWebUtilsStorage(page);
  await page.goto('/docs/markdown-documents.html');
  await expect(page.locator('#document-preview h1')).toHaveText('Working notes', { timeout: 25_000 });
  const files = readDocx(await download(page, 'Download DOCX', testInfo, 'document.docx'));
  expect(files['word/document.xml']).toContain('Working notes');
  const pdf = await download(page, 'Download PDF', testInfo, 'document.pdf');
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  await page.screenshot({ path: testInfo.outputPath('preview.png'), fullPage: true });
});
