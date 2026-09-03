# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> mobile /documenti main has no horizontal overflow
- Location: e2e\smoke\13-list-layout-views.spec.ts:130:7

# Error details

```
Error: {"ok":false,"reason":"missing-main"}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - main [ref=e15]:
    - generic [ref=e18]:
      - generic [ref=e21]:
        - button "Apri menu" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - generic [ref=e26]:
          - heading "Documenti" [level=1]
        - button "Log attività" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
          - generic [ref=e33]: Log attività
      - generic [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e45]:
                - generic:
                  - img
                - searchbox "Cerca documenti" [ref=e46]
              - generic [ref=e47]:
                - button "Carica" [ref=e49] [cursor=pointer]:
                  - img [ref=e50]
                  - generic [ref=e53]: Carica
                - generic [ref=e54]:
                  - button "Filtri" [ref=e55] [cursor=pointer]:
                    - img [ref=e56]
                  - button "Altro" [ref=e58] [cursor=pointer]:
                    - img [ref=e59]
                    - generic [ref=e63]: Altro
            - generic [ref=e68]:
              - generic [ref=e69]: "6"
              - generic [ref=e70]: risultati
          - generic [ref=e73]:
            - generic [ref=e74]:
              - button "Nascondi Certificazioni" [expanded] [ref=e76] [cursor=pointer]:
                - generic [ref=e77]:
                  - heading "Certificazioni" [level=2] [ref=e78]
                  - paragraph [ref=e79]: 3 documenti
                - img [ref=e81]
              - region "Certificazioni" [ref=e83]:
                - list [ref=e86]:
                  - option "Anteprima documento ISO 14001 CERTIFICAZIONE · Certificazioni · PDF Apri documento Dettagli documento" [ref=e87] [cursor=pointer]:
                    - generic [ref=e88]:
                      - generic:
                        - img "Anteprima documento"
                      - generic [ref=e89]:
                        - button "ISO 14001" [ref=e91]:
                          - generic [ref=e92]: ISO 14001
                        - paragraph [ref=e93]: CERTIFICAZIONE · Certificazioni · PDF
                    - generic [ref=e95]:
                      - button "Apri documento" [ref=e96]:
                        - img [ref=e97]
                      - button "Dettagli documento" [ref=e99]:
                        - img [ref=e100]
                  - option "Anteprima documento ISO 45001 CERTIFICAZIONE · Certificazioni · PDF Apri documento Dettagli documento" [ref=e102] [cursor=pointer]:
                    - generic [ref=e103]:
                      - generic:
                        - img "Anteprima documento"
                      - generic [ref=e104]:
                        - button "ISO 45001" [ref=e106]:
                          - generic [ref=e107]: ISO 45001
                        - paragraph [ref=e108]: CERTIFICAZIONE · Certificazioni · PDF
                    - generic [ref=e110]:
                      - button "Apri documento" [ref=e111]:
                        - img [ref=e112]
                      - button "Dettagli documento" [ref=e114]:
                        - img [ref=e115]
                  - option "Anteprima documento ISO 9001 CERTIFICAZIONE · Certificazioni · PDF Apri documento Dettagli documento" [ref=e117] [cursor=pointer]:
                    - generic [ref=e118]:
                      - generic:
                        - img "Anteprima documento"
                      - generic [ref=e119]:
                        - button "ISO 9001" [ref=e121]:
                          - generic [ref=e122]: ISO 9001
                        - paragraph [ref=e123]: CERTIFICAZIONE · Certificazioni · PDF
                    - generic [ref=e125]:
                      - button "Apri documento" [ref=e126]:
                        - img [ref=e127]
                      - button "Dettagli documento" [ref=e129]:
                        - img [ref=e130]
            - generic [ref=e132]:
              - button "Mostra AMS" [ref=e134] [cursor=pointer]:
                - generic [ref=e135]:
                  - heading "AMS" [level=2] [ref=e136]
                  - paragraph [ref=e137]: 1 documento
                - img [ref=e139]
              - list [ref=e142]:
                - option [ref=e143] [cursor=pointer]:
                  - generic [ref=e144]:
                    - img [ref=e146]
                    - generic [ref=e149]:
                      - button [ref=e151]:
                        - generic [ref=e152]: LISTINO RICAMBI AMS 2026
                      - paragraph [ref=e153]: LISTINO · AMS · Listini · Excel
                  - generic [ref=e155]:
                    - button [ref=e156]:
                      - img [ref=e157]
                    - button [ref=e159]:
                      - img [ref=e160]
                    - button [ref=e162]:
                      - img [ref=e163]
            - generic [ref=e165]:
              - button "Mostra OMB" [ref=e167] [cursor=pointer]:
                - generic [ref=e168]:
                  - heading "OMB" [level=2] [ref=e169]
                  - paragraph [ref=e170]: 1 documento
                - img [ref=e172]
              - list [ref=e175]:
                - option [ref=e176] [cursor=pointer]:
                  - generic [ref=e180]:
                    - generic [ref=e181]:
                      - button [ref=e182]:
                        - generic [ref=e183]: LISTINO RICAMBI OMB 2026
                      - generic [ref=e184]:
                        - generic [ref=e185]: —
                        - text: Non in Ricambi AI
                    - paragraph [ref=e186]: LISTINO · OMB · Listini · PDF
                  - generic [ref=e188]:
                    - button [ref=e189]:
                      - img [ref=e190]
                    - button [ref=e192]:
                      - img [ref=e193]
                    - button [ref=e195]:
                      - img [ref=e196]
            - generic [ref=e198]:
              - button "Mostra Schmidt" [ref=e200] [cursor=pointer]:
                - generic [ref=e201]:
                  - heading "Schmidt" [level=2] [ref=e202]
                  - paragraph [ref=e203]: 1 documento
                - img [ref=e205]
              - list [ref=e208]:
                - option [ref=e209] [cursor=pointer]:
                  - generic [ref=e213]:
                    - generic [ref=e214]:
                      - button [ref=e215]:
                        - generic [ref=e216]: LISTINO SCHMIDT 2026.pdf
                      - generic [ref=e217]:
                        - generic [ref=e218]: ○
                        - text: In coda
                    - paragraph [ref=e219]: LISTINO · Schmidt · Listini · PDF
                  - generic [ref=e221]:
                    - button [ref=e222]:
                      - img [ref=e223]
                    - button [ref=e225]:
                      - img [ref=e226]
                    - button [ref=e228]:
                      - img [ref=e229]
        - button "Choose File" [ref=e231]
```

# Test source

```ts
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
> 147 |     expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
      |                                                   ^ Error: {"ok":false,"reason":"missing-main"}
  148 |   });
  149 | }
  150 | 
```