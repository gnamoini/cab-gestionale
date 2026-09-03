# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> mobile /report main has no horizontal overflow
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
    - generic [ref=e10]:
      - text: Compiling
      - generic [ref=e11]:
        - generic [ref=e12]: .
        - generic [ref=e13]: .
        - generic [ref=e14]: .
  - alert [ref=e15]
  - region "Attiva notifiche gestionale" [ref=e16]:
    - generic [ref=e18]:
      - generic [ref=e19]:
        - img [ref=e22]
        - generic [ref=e24]:
          - generic [ref=e25]:
            - paragraph [ref=e26]: Attiva le notifiche
            - generic [ref=e27]: Su questo browser
          - paragraph [ref=e28]: Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.
      - generic [ref=e30]:
        - button "No, grazie" [ref=e31] [cursor=pointer]
        - button "Sì, attiva" [ref=e32] [cursor=pointer]
  - main [ref=e36]:
    - generic [ref=e40]:
      - generic [ref=e43]:
        - button "Apri menu" [ref=e45] [cursor=pointer]:
          - img [ref=e46]
        - generic [ref=e48]:
          - heading "Report" [level=1]
      - generic [ref=e50]:
        - generic [ref=e52]:
          - img [ref=e54]
          - generic [ref=e56]:
            - heading "Centro analisi" [level=2] [ref=e57]
            - paragraph [ref=e58]: Una fotografia del periodo. Sotto, scegli un'area per il dettaglio.
        - region "Come stiamo andando?" [ref=e59]:
          - generic [ref=e60]:
            - heading "Come stiamo andando?" [level=3] [ref=e61]
            - paragraph [ref=e62]: Sintesi del periodo. I dettagli sono nelle aree sotto.
          - generic [ref=e63]:
            - group "Periodo di analisi" [ref=e64]:
              - button "Ultimi 30 giorni" [ref=e65] [cursor=pointer]
              - button "Ultimi 3 mesi" [pressed] [ref=e66] [cursor=pointer]
              - button "Anno corrente" [ref=e67] [cursor=pointer]
              - button "Personalizzato" [ref=e68] [cursor=pointer]
            - paragraph [ref=e69]: 1 lug 2026 → 2 set 2026
          - status "Caricamento sintesi" [ref=e70]
        - region "Approfondisci per area" [ref=e79]:
          - generic [ref=e80]:
            - heading "Approfondisci per area" [level=3] [ref=e81]
            - paragraph [ref=e82]: Scegli un ambito per entrare nel dettaglio.
          - generic [ref=e83]:
            - link "Panoramica Executive overview, trend principali, insight e storico" [ref=e84] [cursor=pointer]:
              - /url: /report/panoramica
              - generic [ref=e85]:
                - img [ref=e87]
                - img [ref=e90]
              - generic [ref=e92]: Panoramica
              - generic [ref=e93]: Executive overview, trend principali, insight e storico
            - link "Lavorazioni Throughput, WIP, aging, SLA e performance officina" [ref=e94] [cursor=pointer]:
              - /url: /report/lavorazioni
              - generic [ref=e95]:
                - img [ref=e97]
                - img [ref=e100]
              - generic [ref=e102]: Lavorazioni
              - generic [ref=e103]: Throughput, WIP, aging, SLA e performance officina
            - link "Magazzino Stock, consumi, rotazioni e rischio scorte" [ref=e104] [cursor=pointer]:
              - /url: /report/magazzino
              - generic [ref=e105]:
                - img [ref=e107]
                - img [ref=e110]
              - generic [ref=e112]: Magazzino
              - generic [ref=e113]: Stock, consumi, rotazioni e rischio scorte
            - link "Dipendenti Ore, produttività, carico e analisi officina" [ref=e114] [cursor=pointer]:
              - /url: /report/dipendenti
              - generic [ref=e115]:
                - img [ref=e117]
                - img [ref=e120]
              - generic [ref=e122]: Dipendenti
              - generic [ref=e123]: Ore, produttività, carico e analisi officina
            - link "Preventivi Volume, valore, accettazione e marginalità" [ref=e124] [cursor=pointer]:
              - /url: /report/preventivi
              - generic [ref=e125]:
                - img [ref=e127]
                - img [ref=e130]
              - generic [ref=e132]: Preventivi
              - generic [ref=e133]: Volume, valore, accettazione e marginalità
            - link "Mezzi Flotta, disponibilità, recidività e MTBF" [ref=e134] [cursor=pointer]:
              - /url: /report/mezzi
              - generic [ref=e135]:
                - img [ref=e137]
                - img [ref=e140]
              - generic [ref=e142]: Mezzi
              - generic [ref=e143]: Flotta, disponibilità, recidività e MTBF
            - link "Economia Ricavi, costi, margini e risultati economici" [ref=e144] [cursor=pointer]:
              - /url: /report/economia
              - generic [ref=e145]:
                - img [ref=e147]
                - img [ref=e150]
              - generic [ref=e152]: Economia
              - generic [ref=e153]: Ricavi, costi, margini e risultati economici
            - link "Clienti KPI clienti, andamento e distribuzione fatturato" [ref=e154] [cursor=pointer]:
              - /url: /report/clienti
              - generic [ref=e155]:
                - img [ref=e157]
                - img [ref=e160]
              - generic [ref=e162]: Clienti
              - generic [ref=e163]: KPI clienti, andamento e distribuzione fatturato
            - link "Analisi trasversali Metriche e trend cross-domain tra ambiti" [ref=e164] [cursor=pointer]:
              - /url: /report/trasversali
              - generic [ref=e165]:
                - img [ref=e167]
                - img [ref=e171]
              - generic [ref=e173]: Analisi trasversali
              - generic [ref=e174]: Metriche e trend cross-domain tra ambiti
            - link "Contesto Contesto operativo, eventi e timeline" [ref=e175] [cursor=pointer]:
              - /url: /report/contesto
              - generic [ref=e176]:
                - img [ref=e178]
                - img [ref=e181]
              - generic [ref=e183]: Contesto
              - generic [ref=e184]: Contesto operativo, eventi e timeline
            - link "Report AI Report AI, Chiedi al Report e Centro decisioni" [ref=e185] [cursor=pointer]:
              - /url: /report/ai
              - generic [ref=e186]:
                - img [ref=e188]
                - img [ref=e191]
              - generic [ref=e193]: Report AI
              - generic [ref=e194]: Report AI, Chiedi al Report e Centro decisioni
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