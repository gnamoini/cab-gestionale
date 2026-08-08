# Android cold start measurement artifacts

Salvare qui i JSON raccolti dalla procedura device:

`docs/investigation/android-pwa-cold-start-procedure.md`

Naming: `<scenario>-<route>-<run>.json` (es. `cold-dashboard-03.json`)

Aggregazione:

```bash
node scripts/ops/android-cold-start-aggregate.mjs
```

Proxy Playwright (non sostituisce device):

```bash
NEXT_PUBLIC_BOOT_INVESTIGATION=1 PERF_USE_DEV=1 npx playwright test e2e/perf/android-pwa-cold-start.spec.ts -c e2e/perf/playwright.config.ts
```
