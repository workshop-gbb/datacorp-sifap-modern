# SIFAP viewer frontend

Next.js App Router, React, TypeScript strict and an editorial, accessible
interface in English, Spanish and Brazilian Portuguese.

## Run and verify

Use Node 24 and pnpm 10.30.3. The backend is required for authenticated pages;
there is no successful-looking mock fallback.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test --coverage
```

Set server-only `API_URL` to the backend origin before starting the application.
For local development, `pnpm dev` serves the UI; the Compose instructions in
[viewer operations](../docs/operations/viewer.md) run the production images.

## Browser verification

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Provide the ADMIN and VIEWER credentials through `SIFAP_TEST_SECRET_FILE` or
protected `SIFAP_ADMIN_*` / `SIFAP_VIEWER_*` environment variables. Use
`SIFAP_BASE_URL` and `SIFAP_API_BASE` for the modern origin and
`SIFAP_LEGACY_BASE_URL` for the retro legacy origin. No password or session token
belongs in a test source file.

The tests cover all three locales, mobile/desktop layouts, actual sign-in,
consultation, details, filtering, pagination, report download, logout and API
permission enforcement. Unit coverage is measured for the localization and
query helpers; server-rendered journeys are covered by the browser suite.

## Design and implementation

- Inter and JetBrains Mono are self-hosted via their licensed Fontsource packages.
- SVG charts have text/table equivalents and use data from the API.
- Server Components fetch records; client components are limited to interactions.
- Authentication uses server actions and an HttpOnly cookie, never localStorage.
- Authenticated record links use document navigation to revalidate access and
  avoid speculative fetching of personal-record pages.
- CSS print rules format reports for the browser's Print / Save as PDF operation.
- The reference dataset is synthetic and is identified throughout the application.
