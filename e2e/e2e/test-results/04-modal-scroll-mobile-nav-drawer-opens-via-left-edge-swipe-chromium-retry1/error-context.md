# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-modal-scroll.spec.ts >> mobile nav drawer opens via left-edge swipe
- Location: e2e\smoke\04-modal-scroll.spec.ts:18:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Menu principale' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Menu principale' })

```

```yaml
- alert
- region "Attiva notifiche gestionale":
  - paragraph: Attiva le notifiche
  - text: Su questo browser
  - paragraph: Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.
  - button "No, grazie"
  - button "Sì, attiva"
- main:
  - button "Apri menu"
  - heading "Dashboard" [level=1]
  - img "C.A.B."
  - heading "Buonasera, Local" [level=2]
  - paragraph: Benvenuto nel gestionale officina.
  - button "Nascondi Stato operativo" [expanded]:
    - heading "Stato operativo" [level=2]
    - paragraph: 47/100
    - paragraph: Attenzione
  - region "Stato operativo":
    - article:
      - heading "Andamento settimanale" [level=3]
      - img "Andamento settimanale dello stato operativo negli ultimi 6 mesi":
        - text: 0 50 100 mar apr mag giu lug ago
        - 'button "Settimana fino a 15 mar: 70 Buono"'
        - 'button "Settimana fino a 22 mar: 69 Buono"'
        - 'button "Settimana fino a 29 mar: 69 Buono"'
        - 'button "Settimana fino a 5 apr: 69 Buono"'
        - 'button "Settimana fino a 12 apr: 69 Buono"'
        - 'button "Settimana fino a 19 apr: 69 Buono"'
        - 'button "Settimana fino a 26 apr: 69 Buono"'
        - 'button "Settimana fino a 3 mag: 69 Buono"'
        - 'button "Settimana fino a 10 mag: 69 Buono"'
        - 'button "Settimana fino a 17 mag: 69 Buono"'
        - 'button "Settimana fino a 24 mag: 68 Buono"'
        - 'button "Settimana fino a 31 mag: 59 Attenzione"'
        - 'button "Settimana fino a 7 giu: 49 Attenzione"'
        - 'button "Settimana fino a 14 giu: 53 Attenzione"'
        - 'button "Settimana fino a 21 giu: 57 Attenzione"'
        - 'button "Settimana fino a 28 giu: 58 Attenzione"'
        - 'button "Settimana fino a 5 lug: 57 Attenzione"'
        - 'button "Settimana fino a 12 lug: 56 Attenzione"'
        - 'button "Settimana fino a 19 lug: 57 Attenzione"'
        - 'button "Settimana fino a 26 lug: 59 Attenzione"'
        - 'button "Settimana fino a 2 ago: 63 Buono"'
        - 'button "Settimana fino a 9 ago: 65 Buono"'
        - 'button "Settimana fino a 16 ago: 60 Buono"'
        - 'button "Settimana fino a 23 ago: 54 Attenzione"'
        - 'button "Settimana fino a 30 ago: 50 Attenzione"'
        - 'button "Settimana fino a 6 set: 47 Attenzione"'
    - article:
      - heading "Punteggio per area" [level=3]
      - list:
        - listitem:
          - paragraph: Economico
          - text: 5/100 0 pt 0%
          - paragraph: "Periodo precedente: 5/100"
        - listitem:
          - paragraph: Magazzino
          - text: 68/100 0 pt 0%
          - paragraph: "Periodo precedente: 68/100"
        - listitem:
          - paragraph: Personale
          - text: 50/100 -40 pt -44,4%
          - paragraph: "Periodo precedente: 90/100"
        - listitem:
          - paragraph: Produzione
          - text: 74/100 -8 pt -9,8%
          - paragraph: "Periodo precedente: 82/100"
    - article:
      - heading "Sintesi calcolo" [level=3]
      - list:
        - listitem:
          - paragraph: Media aree
          - text: 52/100 -11 pt -17,5%
          - paragraph: "Periodo precedente: 63/100"
        - listitem:
          - paragraph: Penalità rischio
          - text: −5
          - paragraph: Sullo stato attuale dell'officina.
        - listitem:
          - paragraph: Totale
          - text: 47/100 -11 pt -19%
          - paragraph: "Periodo precedente: 58/100"
      - heading "Target di riferimento" [level=4]
      - paragraph: Punteggio basato sul raggiungimento dei target officina (90/100 per obiettivo raggiunto).
      - button "Modifica target officina"
    - article:
      - heading "Ha abbassato il punteggio" [level=3]
      - list:
        - listitem:
          - 'link "Vai alla fonte: Ritardo oltre 14 giorni dall''ingresso"':
            - /url: /lavorazioni?focusLav=e2782185-c973-4a66-8e95-e19b28f08922
            - paragraph: Ritardo oltre 14 giorni dall'ingresso
            - paragraph: 5.3 lavorazioni in ritardo su 19 aperte · penalità −3 pt sul totale
            - text: "-3"
        - listitem:
          - 'link "Vai alla fonte: Assenze del team"':
            - /url: /dipendenti
            - paragraph: Assenze del team
            - paragraph: 86.8% (prima 5.5%) · +1478.2% · valutazione 10.4/100 · peso 20% sul totale
            - text: "-2"
        - listitem:
          - 'link "Vai alla fonte: Lavori in attesa oltre la media"':
            - /url: /lavorazioni?focusLav=ccb48d52-adda-4570-b710-0997a972f0c1
            - paragraph: Lavori in attesa oltre la media
            - paragraph: 3 lavorazioni ferme oltre la media di attesa · penalità −2 pt sul totale
            - text: "-2"
        - listitem:
          - 'link "Vai alla fonte: Fatturato emesso"':
            - /url: /report
            - paragraph: Fatturato emesso
            - paragraph: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Incassi registrati"':
            - /url: /report
            - paragraph: Incassi registrati
            - paragraph: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Preventivi preparati"':
            - /url: /preventivi
            - paragraph: Preventivi preparati
            - paragraph: 0 (prima 1) · -100% · valutazione 5/100 · peso 4% sul totale · affidabilità bassa
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Pezzi usati sui lavori"':
            - /url: /magazzino
            - paragraph: Pezzi usati sui lavori
            - paragraph: 8 (prima 18) · -55.6% · valutazione 18/100 · peso 18% sul totale
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Meno ore lavorate"':
            - /url: /dipendenti
            - paragraph: Meno ore lavorate
            - paragraph: 471 h (prima 796 h) · -40.8% · valutazione 58.9/100 · peso 20% sul totale
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Anzianità media lavori aperti"':
            - /url: /lavorazioni
            - paragraph: Anzianità media lavori aperti
            - paragraph: 30.9 gg, uguale al periodo precedente · valutazione 81.6/100 · peso 36% sul totale
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Meno lavori chiusi"':
            - /url: /lavorazioni
            - paragraph: Meno lavori chiusi
            - paragraph: 31 (prima 65) · -52.3% · valutazione 55.8/100 · peso 39% sul totale
            - text: "-1"
        - listitem:
          - 'link "Vai alla fonte: Tempo sui lavori urgenti"':
            - /url: /lavorazioni
            - paragraph: Tempo sui lavori urgenti
            - paragraph: 7.8 gg, uguale al periodo precedente · valutazione 34.6/100 · peso 23% sul totale · affidabilità media
            - text: "-1"
  - button "Nascondi Brief operativo" [expanded]:
    - heading "Brief operativo" [level=2]
  - region "Brief operativo":
    - group "Granularità periodo brief operativo":
      - button "Giorno"
      - button "Settimana" [pressed]
      - button "Mese"
    - group "Finestra temporale brief operativo":
      - button "Corrente" [pressed]
      - button "Sett. prec."
    - article:
      - heading "Lavorazioni" [level=3]
      - list:
        - listitem:
          - paragraph: Lavorazioni chiuse
          - text: 3 -7 -70%
          - paragraph: "Settimana precedente: 10"
        - listitem:
          - paragraph: Nuove lavorazioni aperte
          - text: 5 -13 -72,2%
          - paragraph: "Settimana precedente: 18"
        - listitem:
          - paragraph: Tempo medio chiusura
          - text: 4,7 gg -3 gg -39%
          - paragraph: "Settimana precedente: 7,7 gg"
    - article:
      - heading "Personale" [level=3]
      - list:
        - listitem:
          - paragraph: Ore di lavoro
          - text: 120 h -74 h -38,1%
          - paragraph: "Settimana precedente: 194 h"
        - listitem:
          - paragraph: Ore di assenza
          - text: 0 h -6 h -100%
          - paragraph: "Settimana precedente: 6 h"
        - listitem:
          - paragraph: Ore straordinarie
          - text: 0 h +0 h 0%
          - paragraph: "Settimana precedente: 0 h"
    - article:
      - heading "Ricambi" [level=3]
      - list:
        - listitem:
          - paragraph: Pezzi in uscita
          - text: 0 -1 -100%
          - paragraph: "Settimana precedente: 1"
        - listitem:
          - paragraph: Pezzi in ingresso
          - text: 2 +1 +100%
          - paragraph: "Settimana precedente: 1"
        - listitem:
          - paragraph: Articoli sotto scorta
          - text: "0"
          - paragraph: Quantità sotto la scorta minima
    - article:
      - heading "Amministrazione" [level=3]
      - list:
        - listitem:
          - paragraph: Fatturato emesso
          - text: 0 € +0 € 0%
          - paragraph: "Settimana precedente: 0 €"
        - listitem:
          - paragraph: Incassi
          - text: 0 € +0 € 0%
          - paragraph: "Settimana precedente: 0 €"
        - listitem:
          - paragraph: Preventivi creati
          - text: 0 +0 0%
          - paragraph: "Settimana precedente: 0"
  - button "Mostra Attività recenti":
    - heading "Attività recenti" [level=2]
  - button "Mostra Diario operativo":
    - heading "Diario operativo" [level=2]
```

# Test source

```ts
  1   | import { assertGestionalePageScrollUnlocked } from "../helpers/regression";
  2   | import { attachConsoleGuards } from "../helpers/console";
  3   | import { adminCredentials, loginViaUi } from "../fixtures/auth";
  4   | import { test, expect } from "@playwright/test";
  5   | 
  6   | test("mobile drawer releases body scroll lock", async ({ page }) => {
  7   |   attachConsoleGuards(page);
  8   |   await page.setViewportSize({ width: 390, height: 844 });
  9   |   await loginViaUi(page, adminCredentials());
  10  |   await page.goto("/dashboard");
  11  |   await page.getByTestId("smoke-nav-drawer-open").click();
  12  |   await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible();
  13  |   await page.getByRole("dialog", { name: "Menu principale" }).getByRole("button", { name: "Chiudi" }).click();
  14  |   await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  15  |   await assertGestionalePageScrollUnlocked(page);
  16  | });
  17  | 
  18  | test("mobile nav drawer opens via left-edge swipe", async ({ page }) => {
  19  |   attachConsoleGuards(page);
  20  |   await page.setViewportSize({ width: 390, height: 844 });
  21  |   await loginViaUi(page, adminCredentials());
  22  |   await page.goto("/dashboard");
  23  |   await expect(page.getByRole("dialog", { name: "Menu principale" })).not.toBeVisible();
  24  | 
  25  |   await page.evaluate(() => {
  26  |     const startX = 5;
  27  |     const endX = 200;
  28  |     const y = 420;
  29  | 
  30  |     const mkTouch = (x: number) =>
  31  |       new Touch({
  32  |         identifier: 1,
  33  |         target: document.body,
  34  |         clientX: x,
  35  |         clientY: y,
  36  |         pageX: x,
  37  |         pageY: y,
  38  |       });
  39  | 
  40  |     document.dispatchEvent(
  41  |       new TouchEvent("touchstart", {
  42  |         bubbles: true,
  43  |         cancelable: true,
  44  |         touches: [mkTouch(startX)],
  45  |         targetTouches: [mkTouch(startX)],
  46  |       }),
  47  |     );
  48  | 
  49  |     for (let x = startX + 16; x <= endX; x += 32) {
  50  |       document.dispatchEvent(
  51  |         new TouchEvent("touchmove", {
  52  |           bubbles: true,
  53  |           cancelable: true,
  54  |           touches: [mkTouch(x)],
  55  |           targetTouches: [mkTouch(x)],
  56  |         }),
  57  |       );
  58  |     }
  59  | 
  60  |     document.dispatchEvent(
  61  |       new TouchEvent("touchend", {
  62  |         bubbles: true,
  63  |         cancelable: true,
  64  |         touches: [],
  65  |         changedTouches: [mkTouch(endX)],
  66  |       }),
  67  |     );
  68  |   });
  69  | 
  70  |   const dialog = page.getByRole("dialog", { name: "Menu principale" });
> 71  |   await expect(dialog).toBeVisible({ timeout: 5_000 });
      |                        ^ Error: expect(locator).toBeVisible() failed
  72  |   await page.waitForTimeout(300);
  73  |   await expect(dialog).toBeVisible();
  74  |   await dialog.getByRole("button", { name: "Chiudi" }).click();
  75  |   await expect(dialog).not.toBeVisible();
  76  |   await assertGestionalePageScrollUnlocked(page);
  77  | });
  78  | 
  79  | test("mobile nav drawer scrolls menu items", async ({ page }) => {
  80  |   attachConsoleGuards(page);
  81  |   await page.setViewportSize({ width: 390, height: 844 });
  82  |   await loginViaUi(page, adminCredentials());
  83  |   await page.goto("/dashboard");
  84  |   await page.getByTestId("smoke-nav-drawer-open").click();
  85  |   const dialog = page.getByRole("dialog", { name: "Menu principale" });
  86  |   await expect(dialog).toBeVisible();
  87  | 
  88  |   const scrollHit = await page.evaluate(() => {
  89  |     const dialogEl = document.querySelector('[role="dialog"][aria-label="Menu principale"]');
  90  |     if (!dialogEl) return { ok: false, reason: "missing-dialog" };
  91  |     const nav = dialogEl.querySelector(
  92  |       'nav[aria-label="Sezioni principali"] .overflow-y-auto',
  93  |     ) as HTMLElement | null;
  94  |     if (!nav) return { ok: false, reason: "missing-nav-scroll" };
  95  | 
  96  |     if (nav.scrollHeight <= nav.clientHeight) {
  97  |       const spacer = document.createElement("div");
  98  |       spacer.setAttribute("data-smoke-nav-scroll-spacer", "1");
  99  |       spacer.style.height = `${nav.clientHeight + 400}px`;
  100 |       spacer.style.flexShrink = "0";
  101 |       nav.appendChild(spacer);
  102 |     }
  103 | 
  104 |     const before = nav.scrollTop;
  105 |     nav.scrollTop = 200;
  106 |     return {
  107 |       ok: nav.scrollTop > before,
  108 |       scrollTop: nav.scrollTop,
  109 |       clientHeight: nav.clientHeight,
  110 |       scrollHeight: nav.scrollHeight,
  111 |       touchAction: getComputedStyle(nav).touchAction,
  112 |     };
  113 |   });
  114 | 
  115 |   expect(scrollHit.ok, JSON.stringify(scrollHit)).toBe(true);
  116 |   expect(scrollHit.touchAction).not.toBe("none");
  117 | 
  118 |   await page.getByRole("dialog", { name: "Menu principale" }).getByRole("button", { name: "Chiudi" }).click();
  119 |   await expect(dialog).not.toBeVisible();
  120 |   await assertGestionalePageScrollUnlocked(page);
  121 | });
  122 | 
  123 | test("mobile nav drawer closes via ESC", async ({ page }) => {
  124 |   attachConsoleGuards(page);
  125 |   await page.setViewportSize({ width: 390, height: 844 });
  126 |   await loginViaUi(page, adminCredentials());
  127 |   await page.goto("/dashboard");
  128 |   await page.getByTestId("smoke-nav-drawer-open").click();
  129 |   const dialog = page.getByRole("dialog", { name: "Menu principale" });
  130 |   await expect(dialog).toBeVisible();
  131 |   await page.keyboard.press("Escape");
  132 |   await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  133 |   await assertGestionalePageScrollUnlocked(page);
  134 | });
  135 | 
  136 | test("mobile nav drawer does not open from center swipe", async ({ page }) => {
  137 |   attachConsoleGuards(page);
  138 |   await page.setViewportSize({ width: 390, height: 844 });
  139 |   await loginViaUi(page, adminCredentials());
  140 |   await page.goto("/dashboard");
  141 | 
  142 |   await page.evaluate(() => {
  143 |     const startX = 200;
  144 |     const endX = 320;
  145 |     const y = 420;
  146 |     const mkTouch = (x: number) =>
  147 |       new Touch({
  148 |         identifier: 1,
  149 |         target: document.body,
  150 |         clientX: x,
  151 |         clientY: y,
  152 |         pageX: x,
  153 |         pageY: y,
  154 |       });
  155 |     document.dispatchEvent(
  156 |       new TouchEvent("touchstart", {
  157 |         bubbles: true,
  158 |         cancelable: true,
  159 |         touches: [mkTouch(startX)],
  160 |         targetTouches: [mkTouch(startX)],
  161 |       }),
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
```