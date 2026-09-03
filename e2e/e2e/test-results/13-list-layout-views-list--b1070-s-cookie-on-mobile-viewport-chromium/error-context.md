# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> list surface /preventivi: cards cookie on mobile viewport
- Location: e2e\smoke\13-list-layout-views.spec.ts:55:7

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
  - main [ref=e32]:
    - generic [ref=e35]:
      - generic [ref=e38]:
        - button "Apri menu" [ref=e40] [cursor=pointer]:
          - img [ref=e41]
        - generic [ref=e43]:
          - heading "Preventivi" [level=1]
        - button "Azioni pagina" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e51]: Azioni pagina
      - generic [ref=e52]:
        - button [ref=e54] [cursor=pointer]: Importa
        - generic [ref=e57]:
          - region "Azioni e filtri preventivi" [ref=e58]:
            - generic [ref=e60]:
              - generic [ref=e61]:
                - generic [ref=e64]:
                  - generic:
                    - img
                  - combobox "Cerca preventivi" [ref=e65]
                - generic [ref=e66]:
                  - button "Nuovo preventivo" [ref=e69] [cursor=pointer]:
                    - generic [ref=e70]:
                      - img [ref=e71]
                      - generic [ref=e73]: Nuovo
                  - button "Filtri" [ref=e75] [cursor=pointer]:
                    - img [ref=e76]
              - generic [ref=e82]:
                - generic [ref=e83]: "3"
                - generic [ref=e84]: risultati
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e89]:
                - generic [ref=e90]:
                  - generic [ref=e91]:
                    - paragraph [ref=e92]: 26-0270/1
                    - generic "Preventivo" [ref=e93]: Prev.
                  - paragraph [ref=e94]: SI.ECO
                  - paragraph [ref=e95]: Sistemi SC21
                - generic [ref=e96]:
                  - paragraph [ref=e97]: 520,30 €
                  - generic [ref=e99]: —
              - generic [ref=e100]:
                - generic [ref=e101]:
                  - term [ref=e102]: Tipo
                  - definition [ref=e103]: Preventivo
                - generic [ref=e104]:
                  - term [ref=e105]: Data
                  - definition [ref=e106]: 31/07/2026
                - generic [ref=e107]:
                  - term [ref=e108]: Cantiere
                  - definition [ref=e109]: Conversano
                - generic [ref=e110]:
                  - term [ref=e111]: Utilizzatore
                  - definition [ref=e112]: —
                - generic [ref=e113]:
                  - term [ref=e114]: Targa
                  - definition [ref=e115]: —
                - generic [ref=e116]:
                  - term [ref=e117]: Matricola
                  - definition [ref=e118]: "876"
                - generic [ref=e119]:
                  - term [ref=e120]: Scuderia
                  - definition [ref=e121]: —
              - group "Azioni" [ref=e122]:
                - generic [ref=e123]:
                  - link "Lavorazione" [ref=e124] [cursor=pointer]:
                    - /url: /lavorazioni?focusLav=10be9720-09e4-4807-84a0-45e0d0048824&focusLavTarget=attiva
                    - img [ref=e125]
                  - button "Modifica" [ref=e127] [cursor=pointer]:
                    - img [ref=e128]
                  - button "Apri PDF" [ref=e130] [cursor=pointer]:
                    - generic [ref=e131]:
                      - img [ref=e132]
                      - generic [ref=e134]: PDF
                  - button "Genera DDT" [ref=e135] [cursor=pointer]:
                    - generic [ref=e136]:
                      - img [ref=e137]
                      - generic [ref=e139]: DDT
                  - button "Timeline eventi" [ref=e140] [cursor=pointer]:
                    - img [ref=e141]
                  - button "Analisi Economica" [ref=e143] [cursor=pointer]:
                    - img [ref=e144]
                  - button "Elimina" [ref=e146] [cursor=pointer]:
                    - img [ref=e147]
            - generic [ref=e149]:
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - generic [ref=e152]:
                    - paragraph [ref=e153]: 26-0226/1
                    - generic "Preventivo" [ref=e154]: Prev.
                  - paragraph [ref=e155]: Teknoservice
                  - paragraph [ref=e156]: Sicas NA4m3
                - generic [ref=e157]:
                  - paragraph [ref=e158]: 688,82 €
                  - generic [ref=e160]: —
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - term [ref=e163]: Tipo
                  - definition [ref=e164]: Preventivo
                - generic [ref=e165]:
                  - term [ref=e166]: Data
                  - definition [ref=e167]: 23/07/2026
                - generic [ref=e168]:
                  - term [ref=e169]: Cantiere
                  - definition [ref=e170]: Altamura - Ba
                - generic [ref=e171]:
                  - term [ref=e172]: Utilizzatore
                  - definition [ref=e173]: —
                - generic [ref=e174]:
                  - term [ref=e175]: Targa
                  - definition [ref=e176]: AHL983
                - generic [ref=e177]:
                  - term [ref=e178]: Matricola
                  - definition [ref=e179]: NA4M3A0084
                - generic [ref=e180]:
                  - term [ref=e181]: Scuderia
                  - definition [ref=e182]: —
              - group "Azioni" [ref=e183]:
                - generic [ref=e184]:
                  - link "Lavorazione" [ref=e185] [cursor=pointer]:
                    - /url: /lavorazioni?focusLav=368464f8-1a19-4f07-b778-aace4f455984&focusLavTarget=attiva
                    - img [ref=e186]
                  - button "Modifica" [ref=e188] [cursor=pointer]:
                    - img [ref=e189]
                  - button "Apri PDF" [ref=e191] [cursor=pointer]:
                    - generic [ref=e192]:
                      - img [ref=e193]
                      - generic [ref=e195]: PDF
                  - button "Genera DDT" [ref=e196] [cursor=pointer]:
                    - generic [ref=e197]:
                      - img [ref=e198]
                      - generic [ref=e200]: DDT
                  - button "Timeline eventi" [ref=e201] [cursor=pointer]:
                    - img [ref=e202]
                  - button "Analisi Economica" [ref=e204] [cursor=pointer]:
                    - img [ref=e205]
                  - button "Elimina" [ref=e207] [cursor=pointer]:
                    - img [ref=e208]
            - generic [ref=e210]:
              - generic [ref=e211]:
                - generic [ref=e212]:
                  - generic [ref=e213]:
                    - paragraph [ref=e214]: 26-0239/1
                    - generic "Consuntivo" [ref=e215]: Cons.
                  - paragraph [ref=e216]: SI.ECO
                  - paragraph [ref=e217]: Tecno Industrie Urbis
                  - paragraph [ref=e218]: Isuzu L35
                - generic [ref=e219]:
                  - paragraph [ref=e220]: 309,06 €
                  - generic [ref=e222]: —
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - term [ref=e225]: Tipo
                  - definition [ref=e226]: Consuntivo
                - generic [ref=e227]:
                  - term [ref=e228]: Data
                  - definition [ref=e229]: 23/07/2026
                - generic [ref=e230]:
                  - term [ref=e231]: Cantiere
                  - definition [ref=e232]: Bitritto
                - generic [ref=e233]:
                  - term [ref=e234]: Utilizzatore
                  - definition [ref=e235]: —
                - generic [ref=e236]:
                  - term [ref=e237]: Targa
                  - definition [ref=e238]: ZA056YX
                - generic [ref=e239]:
                  - term [ref=e240]: Matricola
                  - definition [ref=e241]: TIS272312/14
                - generic [ref=e242]:
                  - term [ref=e243]: Scuderia
                  - definition [ref=e244]: —
              - group "Azioni" [ref=e245]:
                - generic [ref=e246]:
                  - link "Lavorazione" [ref=e247] [cursor=pointer]:
                    - /url: /lavorazioni?focusLav=944791b1-fb44-4683-bb09-a42a5a792e66&focusLavTarget=attiva
                    - img [ref=e248]
                  - button "Modifica" [ref=e250] [cursor=pointer]:
                    - img [ref=e251]
                  - button "Apri PDF" [ref=e253] [cursor=pointer]:
                    - generic [ref=e254]:
                      - img [ref=e255]
                      - generic [ref=e257]: PDF
                  - button "Genera DDT" [ref=e258] [cursor=pointer]:
                    - generic [ref=e259]:
                      - img [ref=e260]
                      - generic [ref=e262]: DDT
                  - button "Timeline eventi" [ref=e263] [cursor=pointer]:
                    - img [ref=e264]
                  - button "Analisi Economica" [ref=e266] [cursor=pointer]:
                    - img [ref=e267]
                  - button "Elimina" [ref=e269] [cursor=pointer]:
                    - img [ref=e270]
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
> 64  |     expect(await listCardsMounted(page)).toBe(true);
      |                                          ^ Error: expect(received).toBe(expected) // Object.is equality
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
  75  |     expect(await listTableMounted(page)).toBe(true);
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