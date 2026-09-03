# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-dashboard-report.spec.ts >> dashboard and report load without infinite spinner
- Location: e2e\smoke\03-dashboard-report.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Settimana corrente (lun–oggi)', { exact: true })
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for getByText('Settimana corrente (lun–oggi)', { exact: true })

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
  - time: Mercoledì 2 settembre 2026
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
  1  | import { attachConsoleGuards } from "../helpers/console";
  2  | import { adminCredentials, loginViaUi } from "../fixtures/auth";
  3  | import { test, expect } from "@playwright/test";
  4  | 
  5  | test("dashboard and report load without infinite spinner", async ({ page }) => {
  6  |   attachConsoleGuards(page);
  7  |   await loginViaUi(page, adminCredentials());
  8  | 
  9  |   await page.goto("/dashboard");
  10 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  11 |   await expect(page.getByText("Benvenuto nel gestionale officina.")).toBeVisible({ timeout: 45_000 });
> 12 |   await expect(page.getByText("Settimana corrente (lun–oggi)", { exact: true })).toBeVisible({ timeout: 45_000 });
     |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  13 |   const spinners = page.locator('[class*="cab-spinner-ring"]');
  14 |   if ((await spinners.count()) > 0) {
  15 |     await expect(spinners.first()).not.toBeVisible({ timeout: 45_000 });
  16 |   }
  17 | 
  18 |   await page.goto("/report");
  19 |   await expect(page.getByRole("heading", { name: "Report" })).toBeVisible({ timeout: 45_000 });
  20 |   await expect(page.getByText(/caricamento non riuscito/i)).not.toBeVisible();
  21 |   await expect(page.getByRole("heading", { name: "ANALISI IA" })).toBeVisible({ timeout: 45_000 });
  22 |   await expect(page.getByRole("heading", { name: "LAVORAZIONI" })).toBeVisible();
  23 |   await expect(page.getByRole("heading", { name: "PANORAMICA" })).toBeVisible();
  24 | });
  25 | 
  26 | test("dashboard passive realtime stability", async ({ page }) => {
  27 |   attachConsoleGuards(page);
  28 |   await loginViaUi(page, adminCredentials());
  29 |   await page.goto("/dashboard");
  30 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  31 |   await page.waitForTimeout(15_000);
  32 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  33 | });
  34 | 
```