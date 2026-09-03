# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 12-mobile-routes.spec.ts >> magazzino list: narrow container on wide viewport keeps table without shell overflow
- Location: e2e\smoke\12-mobile-routes.spec.ts:100:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - complementary [ref=e13]:
      - link "C.A.B. Gestionale Officina" [ref=e15] [cursor=pointer]:
        - /url: /dashboard
        - img "C.A.B." [ref=e16]
      - region "Sessione utente" [ref=e17]:
        - generic [ref=e18]:
          - 'button "Profilo account: Local Smoke Admin" [ref=e20] [cursor=pointer]':
            - generic [ref=e24]: L
            - generic: Local Smoke Admin
          - button "Notifiche (19 nuove)" [ref=e25] [cursor=pointer]:
            - img [ref=e29]
            - generic: Notifiche
      - navigation "Sezioni principali" [ref=e31]:
        - generic [ref=e32]:
          - link "Dashboard" [ref=e33] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e36]
            - generic: Dashboard
          - link "Agenda" [ref=e38] [cursor=pointer]:
            - /url: /agenda
            - img [ref=e41]
            - generic: Agenda
          - link "Lavorazioni" [ref=e44] [cursor=pointer]:
            - /url: /lavorazioni
            - img [ref=e47]
            - generic: Lavorazioni
          - link "Portale Clienti" [ref=e49] [cursor=pointer]:
            - /url: /lavorazioni-clienti
            - img [ref=e52]
            - generic: Portale Clienti
          - link "Preventivi" [ref=e58] [cursor=pointer]:
            - /url: /preventivi
            - img [ref=e61]
            - generic: Preventivi
          - link "Ordini fornitori" [ref=e63] [cursor=pointer]:
            - /url: /ordini-fornitori
            - img [ref=e66]
            - generic: Ordini fornitori
          - link "Fatturazione" [ref=e70] [cursor=pointer]:
            - /url: /fatturazione
            - img [ref=e73]
            - generic: Fatturazione
          - link "Documenti" [ref=e76] [cursor=pointer]:
            - /url: /documenti
            - img [ref=e79]
            - generic: Documenti
          - link "Magazzino" [ref=e82] [cursor=pointer]:
            - /url: /magazzino
            - img [ref=e85]
            - generic: Magazzino
          - link "Identifica ricambio" [ref=e88] [cursor=pointer]:
            - /url: /identifica-ricambio
            - img [ref=e91]
            - generic: Identifica ricambio
          - link "Mezzi" [ref=e96] [cursor=pointer]:
            - /url: /mezzi
            - img [ref=e99]
            - generic: Mezzi
          - link "Dipendenti" [ref=e104] [cursor=pointer]:
            - /url: /dipendenti
            - img [ref=e107]
            - generic: Dipendenti
          - link "Report" [ref=e111] [cursor=pointer]:
            - /url: /report
            - img [ref=e114]
            - generic: Report
          - link "Configurazione" [ref=e116] [cursor=pointer]:
            - /url: /impostazioni
            - img [ref=e119]
            - generic: Configurazione
          - link "Sicurezza" [ref=e122] [cursor=pointer]:
            - /url: /sicurezza
            - img [ref=e125]
            - generic: Sicurezza
    - main [ref=e129]:
      - generic [ref=e132]:
        - heading "Magazzino ricambi" [level=1] [ref=e137]
        - status "Caricamento lista" [ref=e139]:
          - region [ref=e144]
```

# Test source

```ts
  18  |       domain: baseUrl.hostname,
  19  |       path: "/",
  20  |     },
  21  |   ]);
  22  | }
  23  | 
  24  | async function listTableMounted(page: Page): Promise<boolean> {
  25  |   return page.evaluate(() => !!document.querySelector(".gestionale-list-table-scope table"));
  26  | }
  27  | 
  28  | async function gotoLavorazioniTableReady(page: Page) {
  29  |   await page.goto("/lavorazioni");
  30  |   await expect(page.locator("main").getByText("Lavorazioni in corso", { exact: false })).toBeVisible({
  31  |     timeout: 60_000,
  32  |   });
  33  | }
  34  | 
  35  | async function gotoMagazzinoTableReady(page: Page) {
  36  |   await page.goto("/magazzino");
  37  |   await expect(page.locator("main").getByText("Magazzino ricambi", { exact: false })).toBeVisible({
  38  |     timeout: 60_000,
  39  |   });
  40  | }
  41  | 
  42  | for (const route of MOBILE_ROUTES) {
  43  |   test(`mobile ${route} main has no horizontal overflow`, async ({ page }) => {
  44  |     test.setTimeout(90_000);
  45  |     attachConsoleGuards(page);
  46  |     await page.setViewportSize(MOBILE_VIEWPORT);
  47  |     await loginViaUi(page, adminCredentials());
  48  |     await page.goto(route);
  49  | 
  50  |     const overflow = await auditHorizontalOverflow(page);
  51  | 
  52  |     expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  53  |   });
  54  | }
  55  | 
  56  | const CURSOR_PREVIEW_VIEWPORTS = [
  57  |   { width: 724, height: 900, label: "724" },
  58  |   { width: 900, height: 900, label: "900" },
  59  |   { width: 1362, height: 900, label: "1362" },
  60  | ] as const;
  61  | 
  62  | for (const vp of CURSOR_PREVIEW_VIEWPORTS) {
  63  |   for (const route of MOBILE_ROUTES) {
  64  |     test(`${route} has no horizontal overflow at ${vp.label}px`, async ({ page }) => {
  65  |       test.setTimeout(90_000);
  66  |       attachConsoleGuards(page);
  67  |       await page.setViewportSize({ width: vp.width, height: vp.height });
  68  |       await loginViaUi(page, adminCredentials());
  69  |       await page.goto(route);
  70  |       await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 60_000 });
  71  | 
  72  |       const overflow = await auditHorizontalOverflow(page);
  73  |       expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  74  |     });
  75  |   }
  76  | }
  77  | 
  78  | test("lavorazioni list: cards cookie on mobile viewport", async ({ page }) => {
  79  |   test.setTimeout(90_000);
  80  |   attachConsoleGuards(page);
  81  |   await page.setViewportSize(MOBILE_VIEWPORT);
  82  |   await setListSurfaceCookie(page, "cards");
  83  |   await loginViaUi(page, adminCredentials());
  84  |   await gotoLavorazioniTableReady(page);
  85  | 
  86  |   expect(await listTableMounted(page)).toBe(false);
  87  | });
  88  | 
  89  | test("magazzino list: cards cookie on mobile viewport", async ({ page }) => {
  90  |   test.setTimeout(90_000);
  91  |   attachConsoleGuards(page);
  92  |   await page.setViewportSize(MOBILE_VIEWPORT);
  93  |   await setListSurfaceCookie(page, "cards");
  94  |   await loginViaUi(page, adminCredentials());
  95  |   await gotoMagazzinoTableReady(page);
  96  | 
  97  |   expect(await listTableMounted(page)).toBe(false);
  98  | });
  99  | 
  100 | test("magazzino list: narrow container on wide viewport keeps table without shell overflow", async ({
  101 |   page,
  102 | }) => {
  103 |   test.setTimeout(90_000);
  104 |   attachConsoleGuards(page);
  105 |   await page.setViewportSize(DESKTOP_VIEWPORT);
  106 |   await setListSurfaceCookie(page, "table");
  107 |   await loginViaUi(page, adminCredentials());
  108 |   await gotoMagazzinoTableReady(page);
  109 | 
  110 |   await page.evaluate(() => {
  111 |     const root = document.querySelector(".gestionale-list-container, .magazzino-scroll-scope");
  112 |     if (root instanceof HTMLElement) {
  113 |       root.style.width = "600px";
  114 |       root.style.maxWidth = "600px";
  115 |     }
  116 |   });
  117 | 
> 118 |   expect(await listTableMounted(page)).toBe(true);
      |                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  119 |   const overflow = await auditHorizontalOverflow(page);
  120 |   expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  121 | });
  122 | 
  123 | test("lavorazioni list: table cookie on desktop viewport", async ({ page }) => {
  124 |   test.setTimeout(90_000);
  125 |   attachConsoleGuards(page);
  126 |   await page.setViewportSize(DESKTOP_VIEWPORT);
  127 |   await setListSurfaceCookie(page, "table");
  128 |   await loginViaUi(page, adminCredentials());
  129 |   await gotoLavorazioniTableReady(page);
  130 | 
  131 |   expect(await listTableMounted(page)).toBe(true);
  132 | });
  133 | 
  134 | test("lavorazioni list: 724px preview has no horizontal shell overflow", async ({ page }) => {
  135 |   test.setTimeout(90_000);
  136 |   attachConsoleGuards(page);
  137 |   await page.setViewportSize({ width: 724, height: 900 });
  138 |   await setListSurfaceCookie(page, "cards");
  139 |   await loginViaUi(page, adminCredentials());
  140 |   await gotoLavorazioniTableReady(page);
  141 | 
  142 |   const overflow = await auditHorizontalOverflow(page);
  143 |   expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  144 | });
  145 | 
  146 | test("lavorazioni list: narrow container on wide viewport keeps table without shell overflow", async ({
  147 |   page,
  148 | }) => {
  149 |   test.setTimeout(90_000);
  150 |   attachConsoleGuards(page);
  151 |   await page.setViewportSize(DESKTOP_VIEWPORT);
  152 |   await setListSurfaceCookie(page, "table");
  153 |   await loginViaUi(page, adminCredentials());
  154 |   await gotoLavorazioniTableReady(page);
  155 | 
  156 |   await page.evaluate(() => {
  157 |     const root = document.querySelector(".gestionale-list-container, .lavorazioni-scroll-scope");
  158 |     if (root instanceof HTMLElement) {
  159 |       root.style.width = "600px";
  160 |       root.style.maxWidth = "600px";
  161 |     }
  162 |   });
  163 | 
  164 |   expect(await listTableMounted(page)).toBe(true);
  165 |   const overflow = await auditHorizontalOverflow(page);
  166 |   expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  167 | });
  168 | 
```