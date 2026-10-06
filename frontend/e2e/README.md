# Frontend Playwright tests

The default E2E suite runs the Vite frontend and mocks backend responses, so it is repeatable without a database, Redis, AI provider key, or deployed services.

```powershell
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e:critical` runs the authentication, dashboard, and developer/AI checks. The HTML report, JSON results, traces, screenshots, and videos are written under the ignored `artifacts/` directory. Generate a concise Markdown summary after a run with:

```powershell
npm run test:e2e:report
```

The live ingestion contract tests are opt-in and require a running gateway, demo ingestion service, and Redis:

```powershell
$env:E2E_LIVE_API = "true"
$env:E2E_API_URL = "http://localhost:8090"
$env:TEST_TENANT_ID = "tenantA"
npx playwright test e2e/ingestion-live.spec.js
```

Set `E2E_BASE_URL` to test an already running frontend. When running against a deployment, use a non-production tenant because the live tests submit usage events.
