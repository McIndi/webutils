# WebUtils Acceptance Tests

This suite uses Playwright to run browser-based acceptance tests for all apps in `docs/`.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run acceptance tests:

```bash
npm run test:acceptance
```

3. Run headed mode:

```bash
npm run test:acceptance:headed
```

4. Open HTML report:

```bash
npm run test:acceptance:report
```

## Scope

- `smoke.spec.js`: load checks for each app in `docs/`.
- `apps.spec.js`: first-pass personalized acceptance checks per app.

## Test Hygiene

- Storage is cleared between tests for `webutils.*` keys.
- IndexedDB `webutils-storage-v1` is deleted between tests.
- Tests run against a local static server (`http-server`) on port 4173.
