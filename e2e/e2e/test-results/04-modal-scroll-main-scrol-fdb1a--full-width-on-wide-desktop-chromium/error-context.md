# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-modal-scroll.spec.ts >> main scroll column spans full width on wide desktop
- Location: e2e\smoke\04-modal-scroll.spec.ts:243:5

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
          - button "Notifiche" [ref=e25] [cursor=pointer]:
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
  162 |     );
  163 |     document.dispatchEvent(
  164 |       new TouchEvent("touchmove", {
  165 |         bubbles: true,
  166 |         cancelable: true,
  167 |         touches: [mkTouch(endX)],
  168 |         targetTouches: [mkTouch(endX)],
  169 |       }),
  170 |     );
  171 |     document.dispatchEvent(
  172 |       new TouchEvent("touchend", {
  173 |         bubbles: true,
  174 |         cancelable: true,
  175 |         touches: [],
  176 |         changedTouches: [mkTouch(endX)],
  177 |       }),
  178 |     );
  179 |   });
  180 | 
  181 |   await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  182 | });
  183 | 
  184 | test("mobile nav rapid open close", async ({ page }) => {
  185 |   attachConsoleGuards(page);
  186 |   await page.setViewportSize({ width: 390, height: 844 });
  187 |   await loginViaUi(page, adminCredentials());
  188 |   await page.goto("/dashboard");
  189 |   const openBtn = page.getByTestId("smoke-nav-drawer-open");
  190 |   await openBtn.click();
  191 |   await openBtn.click({ force: true });
  192 |   const dialog = page.getByRole("dialog", { name: "Menu principale" });
  193 |   await expect(dialog).toBeVisible();
  194 |   await dialog.getByRole("button", { name: "Chiudi" }).click();
  195 |   await expect(dialog).not.toBeVisible();
  196 |   await assertGestionalePageScrollUnlocked(page);
  197 | });
  198 | 
  199 | test("main scrollbar track is reachable at viewport right edge", async ({ page }) => {
  200 |   attachConsoleGuards(page);
  201 |   await page.setViewportSize({ width: 1920, height: 720 });
  202 |   await loginViaUi(page, adminCredentials());
  203 |   await page.goto("/magazzino");
  204 | 
  205 |   const scrollOwner = page.locator("main.gestionale-scroll-y");
  206 |   await expect(scrollOwner).toBeVisible();
  207 | 
  208 |   const hit = await page.evaluate(() => {
  209 |     const main = document.querySelector("main.gestionale-scroll-y");
  210 |     if (!main) return { ok: false, reason: "missing-main" };
  211 | 
  212 |     main.scrollTop = 0;
  213 |     const before = main.scrollTop;
  214 |     main.scrollTop = 400;
  215 |     const scrolled = main.scrollTop > before;
  216 |     const mainEl = main as HTMLElement;
  217 |     if (!scrolled) {
  218 |       mainEl.style.minHeight = "200vh";
  219 |       mainEl.scrollTop = 400;
  220 |     }
  221 | 
  222 |     const rect = main.getBoundingClientRect();
  223 |     const x = Math.min(window.innerWidth - 2, rect.right - 2);
  224 |     const y = rect.top + Math.min(rect.height * 0.5, 200);
  225 |     const el = document.elementFromPoint(x, y);
  226 |     const onMain =
  227 |       el === main ||
  228 |       (el instanceof Node && main.contains(el)) ||
  229 |       rect.right - x <= 16;
  230 | 
  231 |     return {
  232 |       ok: onMain,
  233 |       scrollTop: main.scrollTop,
  234 |       gutter: getComputedStyle(main).scrollbarGutter,
  235 |       tag: el instanceof Element ? el.tagName : null,
  236 |     };
  237 |   });
  238 | 
  239 |   expect(hit.ok, JSON.stringify(hit)).toBe(true);
  240 |   expect(hit.gutter).toBe("stable");
  241 | });
  242 | 
  243 | test("main scroll column spans full width on wide desktop", async ({ page }) => {
  244 |   attachConsoleGuards(page);
  245 |   await page.setViewportSize({ width: 1920, height: 1080 });
  246 |   await loginViaUi(page, adminCredentials());
  247 |   await page.goto("/magazzino");
  248 | 
  249 |   const layout = await page.evaluate(() => {
  250 |     const main = document.querySelector("main.gestionale-scroll-y");
  251 |     if (!main) return { ok: false, reason: "missing-main" };
  252 |     const rect = main.getBoundingClientRect();
  253 |     const delta = window.innerWidth - rect.right;
  254 |     return {
  255 |       ok: delta <= 2,
  256 |       delta,
  257 |       rectRight: rect.right,
  258 |       innerWidth: window.innerWidth,
  259 |     };
  260 |   });
  261 | 
> 262 |   expect(layout.ok, JSON.stringify(layout)).toBe(true);
      |                                             ^ Error: {"ok":false,"reason":"missing-main"}
  263 | });
  264 | 
  265 | test("mobile log drawer scroll host scrolls content", async ({ page }) => {
  266 |   attachConsoleGuards(page);
  267 |   await page.setViewportSize({ width: 390, height: 844 });
  268 |   await loginViaUi(page, adminCredentials());
  269 |   await page.goto("/magazzino");
  270 | 
  271 |   await page.getByRole("button", { name: "Log modifiche" }).click();
  272 |   const logDrawer = page.locator('aside[aria-label="Log modifiche magazzino"]');
  273 |   await expect(logDrawer).toBeVisible();
  274 | 
  275 |   const scrollHit = await page.evaluate(() => {
  276 |     const aside = document.querySelector('aside[aria-label="Log modifiche magazzino"]');
  277 |     if (!aside) return { ok: false, reason: "missing-aside" };
  278 |     const host = aside.querySelector("[data-cab-modal-scroll]") as HTMLElement | null;
  279 |     if (!host) return { ok: false, reason: "missing-scroll-host" };
  280 | 
  281 |     const inner = host.querySelector("ul, p, .gestionale-scrollbar") as HTMLElement | null;
  282 |     if (inner && inner.scrollHeight <= host.clientHeight) {
  283 |       inner.style.minHeight = `${host.clientHeight + 400}px`;
  284 |     } else if (host.scrollHeight <= host.clientHeight) {
  285 |       host.style.minHeight = `${host.clientHeight + 400}px`;
  286 |     }
  287 | 
  288 |     const before = host.scrollTop;
  289 |     host.scrollTop = 200;
  290 |     return {
  291 |       ok: host.scrollTop > before,
  292 |       scrollTop: host.scrollTop,
  293 |       clientHeight: host.clientHeight,
  294 |       scrollHeight: host.scrollHeight,
  295 |       overflowY: getComputedStyle(host).overflowY,
  296 |     };
  297 |   });
  298 | 
  299 |   expect(scrollHit.ok, JSON.stringify(scrollHit)).toBe(true);
  300 | 
  301 |   await page.getByRole("button", { name: "Chiudi" }).click();
  302 |   await expect(logDrawer).not.toBeVisible();
  303 |   await assertGestionalePageScrollUnlocked(page);
  304 | });
  305 | 
  306 | test("log drawer locks body scroll and restores on close", async ({ page }) => {
  307 |   attachConsoleGuards(page);
  308 |   await page.setViewportSize({ width: 1280, height: 720 });
  309 |   await loginViaUi(page, adminCredentials());
  310 |   await page.goto("/magazzino");
  311 | 
  312 |   await page.getByRole("button", { name: "Log modifiche" }).click();
  313 |   const logDrawer = page.locator('aside[aria-label="Log modifiche magazzino"]');
  314 |   await expect(logDrawer).toBeVisible();
  315 | 
  316 |   const locked = await page.evaluate(() => ({
  317 |     lockAttr: document.body.getAttribute("data-cab-scroll-lock-count"),
  318 |     bodyOverflow: document.body.style.overflow,
  319 |   }));
  320 |   expect(locked.lockAttr || locked.bodyOverflow === "hidden").toBeTruthy();
  321 | 
  322 |   await page.getByRole("button", { name: "Chiudi" }).click();
  323 |   await expect(logDrawer).not.toBeVisible();
  324 |   await assertGestionalePageScrollUnlocked(page);
  325 | });
  326 | 
```