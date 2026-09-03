# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> list surface /mezzi: table cookie on desktop viewport
- Location: e2e\smoke\13-list-layout-views.spec.ts:67:7

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
  - region "Attiva notifiche gestionale" [ref=e12]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - img [ref=e18]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - paragraph [ref=e22]: Attiva le notifiche
            - generic [ref=e23]: Su questo browser
          - paragraph [ref=e24]: Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.
      - generic [ref=e26]:
        - button "No, grazie" [ref=e27] [cursor=pointer]
        - button "Sì, attiva" [ref=e28] [cursor=pointer]
  - generic [ref=e29]:
    - complementary [ref=e30]:
      - link "C.A.B. Gestionale Officina" [ref=e32] [cursor=pointer]:
        - /url: /dashboard
        - img "C.A.B." [ref=e33]
      - region "Sessione utente" [ref=e34]:
        - generic [ref=e35]:
          - 'button "Profilo account: Local Smoke Admin" [ref=e37] [cursor=pointer]':
            - generic [ref=e41]: L
            - generic: Local Smoke Admin
          - button "Notifiche (19 nuove)" [ref=e42] [cursor=pointer]:
            - img [ref=e46]
            - generic: Notifiche
      - navigation "Sezioni principali" [ref=e48]:
        - generic [ref=e49]:
          - link "Dashboard" [ref=e50] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e53]
            - generic: Dashboard
          - link "Agenda" [ref=e55] [cursor=pointer]:
            - /url: /agenda
            - img [ref=e58]
            - generic: Agenda
          - link "Lavorazioni" [ref=e61] [cursor=pointer]:
            - /url: /lavorazioni
            - img [ref=e64]
            - generic: Lavorazioni
          - link "Portale Clienti" [ref=e66] [cursor=pointer]:
            - /url: /lavorazioni-clienti
            - img [ref=e69]
            - generic: Portale Clienti
          - link "Preventivi" [ref=e75] [cursor=pointer]:
            - /url: /preventivi
            - img [ref=e78]
            - generic: Preventivi
          - link "Ordini fornitori" [ref=e80] [cursor=pointer]:
            - /url: /ordini-fornitori
            - img [ref=e83]
            - generic: Ordini fornitori
          - link "Fatturazione" [ref=e87] [cursor=pointer]:
            - /url: /fatturazione
            - img [ref=e90]
            - generic: Fatturazione
          - link "Documenti" [ref=e93] [cursor=pointer]:
            - /url: /documenti
            - img [ref=e96]
            - generic: Documenti
          - link "Magazzino" [ref=e99] [cursor=pointer]:
            - /url: /magazzino
            - img [ref=e102]
            - generic: Magazzino
          - link "Identifica ricambio" [ref=e105] [cursor=pointer]:
            - /url: /identifica-ricambio
            - img [ref=e108]
            - generic: Identifica ricambio
          - link "Mezzi" [ref=e113] [cursor=pointer]:
            - /url: /mezzi
            - img [ref=e116]
            - generic: Mezzi
          - link "Dipendenti" [ref=e121] [cursor=pointer]:
            - /url: /dipendenti
            - img [ref=e124]
            - generic: Dipendenti
          - link "Report" [ref=e128] [cursor=pointer]:
            - /url: /report
            - img [ref=e131]
            - generic: Report
          - link "Configurazione" [ref=e133] [cursor=pointer]:
            - /url: /impostazioni
            - img [ref=e136]
            - generic: Configurazione
          - link "Sicurezza" [ref=e139] [cursor=pointer]:
            - /url: /sicurezza
            - img [ref=e142]
            - generic: Sicurezza
    - main [ref=e146]:
      - generic [ref=e149]:
        - heading "Mezzi" [level=1] [ref=e154]
        - status "Caricamento lista" [ref=e156]:
          - region [ref=e161]
```

# Test source

```ts
  1   | import { attachConsoleGuards } from "../helpers/console";
  2   | import { adminCredentials, loginViaUi } from "../fixtures/auth";
  3   | import { test, expect, type Page } from "@playwright/test";
  4   | 
  5   | const MOBILE_VIEWPORT = { width: 390, height: 844 };
  6   | const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
  7   | const LIST_SURFACE_COOKIE = "gestionale-list-surface";
  8   | 
  9   | type ListLayoutRoute = {
  10  |   path: string;
  11  |   readyText: string;
  12  | };
  13  | 
  14  | const XL_LIST_ROUTES: ListLayoutRoute[] = [
  15  |   { path: "/lavorazioni", readyText: "Lavorazioni in corso" },
  16  |   { path: "/mezzi", readyText: "Mezzi" },
  17  |   { path: "/magazzino", readyText: "Magazzino" },
  18  |   { path: "/preventivi", readyText: "Preventivi" },
  19  |   { path: "/lavorazioni-clienti", readyText: "Lavorazioni in corso" },
  20  | ];
  21  | 
  22  | async function setListSurfaceCookie(page: Page, surface: "table" | "cards") {
  23  |   const baseUrl = new URL(page.url() === "about:blank" ? "http://127.0.0.1:3000" : page.url());
  24  |   await page.context().addCookies([
  25  |     {
  26  |       name: LIST_SURFACE_COOKIE,
  27  |       value: surface,
  28  |       domain: baseUrl.hostname,
  29  |       path: "/",
  30  |     },
  31  |   ]);
  32  | }
  33  | 
  34  | async function listTableMounted(page: Page): Promise<boolean> {
  35  |   return page.evaluate(() => !!document.querySelector(".gestionale-list-table-scope table"));
  36  | }
  37  | 
  38  | async function listCardsMounted(page: Page): Promise<boolean> {
  39  |   return page.evaluate(() => {
  40  |     const main = document.querySelector("main");
  41  |     if (!main) return false;
  42  |     return main.querySelectorAll("[class*='CardMobile'], .gestionale-list-table-scope table").length > 0
  43  |       && !document.querySelector(".gestionale-list-table-scope table");
  44  |   });
  45  | }
  46  | 
  47  | async function gotoListRouteReady(page: Page, route: ListLayoutRoute) {
  48  |   await page.goto(route.path);
  49  |   await expect(page.locator("main").getByText(route.readyText, { exact: false })).toBeVisible({
  50  |     timeout: 60_000,
  51  |   });
  52  | }
  53  | 
  54  | for (const route of XL_LIST_ROUTES) {
  55  |   test(`list surface ${route.path}: cards cookie on mobile viewport`, async ({ page }) => {
  56  |     test.setTimeout(90_000);
  57  |     attachConsoleGuards(page);
  58  |     await page.setViewportSize(MOBILE_VIEWPORT);
  59  |     await setListSurfaceCookie(page, "cards");
  60  |     await loginViaUi(page, adminCredentials());
  61  |     await gotoListRouteReady(page, route);
  62  | 
  63  |     expect(await listTableMounted(page)).toBe(false);
  64  |     expect(await listCardsMounted(page)).toBe(true);
  65  |   });
  66  | 
  67  |   test(`list surface ${route.path}: table cookie on desktop viewport`, async ({ page }) => {
  68  |     test.setTimeout(90_000);
  69  |     attachConsoleGuards(page);
  70  |     await page.setViewportSize(DESKTOP_VIEWPORT);
  71  |     await setListSurfaceCookie(page, "table");
  72  |     await loginViaUi(page, adminCredentials());
  73  |     await gotoListRouteReady(page, route);
  74  | 
> 75  |     expect(await listTableMounted(page)).toBe(true);
      |                                          ^ Error: expect(received).toBe(expected) // Object.is equality
  76  |     expect(await listCardsMounted(page)).toBe(false);
  77  |   });
  78  | 
  79  |   test(`list surface ${route.path}: narrow container keeps table with controlled overflow`, async ({ page }) => {
  80  |     test.setTimeout(90_000);
  81  |     attachConsoleGuards(page);
  82  |     await page.setViewportSize(DESKTOP_VIEWPORT);
  83  |     await setListSurfaceCookie(page, "table");
  84  |     await loginViaUi(page, adminCredentials());
  85  |     await gotoListRouteReady(page, route);
  86  | 
  87  |     await page.evaluate(() => {
  88  |       const root = document.querySelector(".gestionale-list-container, .lavorazioni-scroll-scope, .magazzino-scroll-scope");
  89  |       if (root instanceof HTMLElement) {
  90  |         root.style.width = "600px";
  91  |         root.style.maxWidth = "600px";
  92  |       }
  93  |     });
  94  | 
  95  |     expect(await listTableMounted(page)).toBe(true);
  96  |     const overflow = await page.evaluate(() => {
  97  |       const main = document.querySelector("main");
  98  |       if (!main) return { ok: false };
  99  |       return { ok: main.scrollWidth <= main.clientWidth + 4 };
  100 |     });
  101 |     expect(overflow.ok).toBe(true);
  102 |   });
  103 | }
  104 | 
  105 | test("list surface /dipendenti: cards cookie shows mobile timesheet branch", async ({ page }) => {
  106 |   test.setTimeout(90_000);
  107 |   attachConsoleGuards(page);
  108 |   await page.setViewportSize(MOBILE_VIEWPORT);
  109 |   await setListSurfaceCookie(page, "cards");
  110 |   await loginViaUi(page, adminCredentials());
  111 |   await gotoListRouteReady(page, { path: "/dipendenti", readyText: "Tabella presenze" });
  112 | 
  113 |   expect(await listTableMounted(page)).toBe(true);
  114 | });
  115 | 
  116 | test("list surface /sicurezza: cards cookie shows user cards", async ({ page }) => {
  117 |   test.setTimeout(90_000);
  118 |   attachConsoleGuards(page);
  119 |   await page.setViewportSize(MOBILE_VIEWPORT);
  120 |   await setListSurfaceCookie(page, "cards");
  121 |   await loginViaUi(page, adminCredentials());
  122 |   await gotoListRouteReady(page, { path: "/sicurezza", readyText: "Utenti" });
  123 | 
  124 |   expect(await listTableMounted(page)).toBe(false);
  125 | });
  126 | 
  127 | const OVERFLOW_ROUTES = ["/report", "/documenti", "/dashboard"] as const;
  128 | 
  129 | for (const route of OVERFLOW_ROUTES) {
  130 |   test(`mobile ${route} main has no horizontal overflow`, async ({ page }) => {
  131 |     test.setTimeout(90_000);
  132 |     attachConsoleGuards(page);
  133 |     await page.setViewportSize(MOBILE_VIEWPORT);
  134 |     await loginViaUi(page, adminCredentials());
  135 |     await page.goto(route);
  136 | 
  137 |     const overflow = await page.evaluate(() => {
  138 |       const main = document.querySelector("main");
  139 |       if (!main) return { ok: false, reason: "missing-main" };
  140 |       return {
  141 |         ok: main.scrollWidth <= main.clientWidth + 2,
  142 |         scrollWidth: main.scrollWidth,
  143 |         clientWidth: main.clientWidth,
  144 |       };
  145 |     });
  146 | 
  147 |     expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  148 |   });
  149 | }
  150 | 
```