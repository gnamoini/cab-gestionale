# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-modal-scroll.spec.ts >> mobile nav rapid open close
- Location: e2e\smoke\04-modal-scroll.spec.ts:184:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Menu principale' }).getByRole('button', { name: 'Chiudi' })
    - locator resolved to <button type="button" aria-label="Chiudi" class="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-transparent bg-transparent p-0 text-[color:var(--cab-text)] transition-[color,transform] duration-200 ease-out hover:text-[color:color-mix(in_srgb,var(--cab-primary)_82%,var(--cab-text))] focus:outline-none focus:ring-0 focus:text-[color:var(--cab-text)] focus:[&_svg]:scale-100 focus:[&_svg]:drop-shadow-none focus-visible:text-[color:color-mix(in…>…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - element is not visible
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - button "Apri menu" [active] [ref=e40] [cursor=pointer]:
          - img [ref=e41]
        - generic [ref=e43]:
          - heading "Dashboard" [level=1]
      - generic [ref=e44]:
        - generic [ref=e47]:
          - img "C.A.B." [ref=e49]
          - generic [ref=e50]:
            - heading "Buonasera, Local" [level=2] [ref=e51]
            - paragraph [ref=e52]: Benvenuto nel gestionale officina.
        - generic [ref=e53]:
          - generic [ref=e57]:
            - button "Nascondi Stato operativo" [expanded] [ref=e59] [cursor=pointer]:
              - generic [ref=e60]:
                - heading "Stato operativo" [level=2] [ref=e61]
                - generic [ref=e63]:
                  - generic [ref=e64]:
                    - img [ref=e65]
                    - generic: "47"
                  - generic [ref=e68]:
                    - paragraph [ref=e69]: 47/100
                    - paragraph [ref=e70]: Attenzione
              - img [ref=e72]
            - region "Stato operativo" [ref=e74]:
              - generic [ref=e77]:
                - article [ref=e78]:
                  - heading "Andamento settimanale" [level=3] [ref=e80]
                  - img "Andamento settimanale dello stato operativo negli ultimi 6 mesi" [ref=e84]:
                    - generic [ref=e87]: "0"
                    - generic [ref=e89]: "50"
                    - generic [ref=e91]: "100"
                    - generic [ref=e94]: mar
                    - generic [ref=e95]: apr
                    - generic [ref=e96]: mag
                    - generic [ref=e97]: giu
                    - generic [ref=e98]: lug
                    - generic [ref=e99]: ago
                    - 'button "Settimana fino a 15 mar: 70 Buono" [ref=e100] [cursor=pointer]'
                    - 'button "Settimana fino a 22 mar: 69 Buono" [ref=e101] [cursor=pointer]'
                    - 'button "Settimana fino a 29 mar: 69 Buono" [ref=e102] [cursor=pointer]'
                    - 'button "Settimana fino a 5 apr: 69 Buono" [ref=e103] [cursor=pointer]'
                    - 'button "Settimana fino a 12 apr: 69 Buono" [ref=e104] [cursor=pointer]'
                    - 'button "Settimana fino a 19 apr: 69 Buono" [ref=e105] [cursor=pointer]'
                    - 'button "Settimana fino a 26 apr: 69 Buono" [ref=e106] [cursor=pointer]'
                    - 'button "Settimana fino a 3 mag: 69 Buono" [ref=e107] [cursor=pointer]'
                    - 'button "Settimana fino a 10 mag: 69 Buono" [ref=e108] [cursor=pointer]'
                    - 'button "Settimana fino a 17 mag: 69 Buono" [ref=e109] [cursor=pointer]'
                    - 'button "Settimana fino a 24 mag: 68 Buono" [ref=e110] [cursor=pointer]'
                    - 'button "Settimana fino a 31 mag: 59 Attenzione" [ref=e111] [cursor=pointer]'
                    - 'button "Settimana fino a 7 giu: 49 Attenzione" [ref=e112] [cursor=pointer]'
                    - 'button "Settimana fino a 14 giu: 53 Attenzione" [ref=e113] [cursor=pointer]'
                    - 'button "Settimana fino a 21 giu: 57 Attenzione" [ref=e114] [cursor=pointer]'
                    - 'button "Settimana fino a 28 giu: 58 Attenzione" [ref=e115] [cursor=pointer]'
                    - 'button "Settimana fino a 5 lug: 57 Attenzione" [ref=e116] [cursor=pointer]'
                    - 'button "Settimana fino a 12 lug: 56 Attenzione" [ref=e117] [cursor=pointer]'
                    - 'button "Settimana fino a 19 lug: 57 Attenzione" [ref=e118] [cursor=pointer]'
                    - 'button "Settimana fino a 26 lug: 59 Attenzione" [ref=e119] [cursor=pointer]'
                    - 'button "Settimana fino a 2 ago: 63 Buono" [ref=e120] [cursor=pointer]'
                    - 'button "Settimana fino a 9 ago: 65 Buono" [ref=e121] [cursor=pointer]'
                    - 'button "Settimana fino a 16 ago: 60 Buono" [ref=e122] [cursor=pointer]'
                    - 'button "Settimana fino a 23 ago: 54 Attenzione" [ref=e123] [cursor=pointer]'
                    - 'button "Settimana fino a 30 ago: 50 Attenzione" [ref=e124] [cursor=pointer]'
                    - 'button "Settimana fino a 6 set: 47 Attenzione" [ref=e125] [cursor=pointer]'
                - article [ref=e126]:
                  - heading "Punteggio per area" [level=3] [ref=e128]
                  - list [ref=e130]:
                    - listitem [ref=e131]:
                      - paragraph [ref=e132]: Economico
                      - generic [ref=e133]:
                        - generic [ref=e134]: 5/100
                        - generic [ref=e135]:
                          - generic [ref=e136]: →
                          - generic [ref=e137]: 0 pt
                          - generic [ref=e138]: 0%
                      - paragraph [ref=e139]:
                        - text: "Periodo precedente:"
                        - generic [ref=e140]: 5/100
                    - listitem [ref=e141]:
                      - paragraph [ref=e142]: Magazzino
                      - generic [ref=e143]:
                        - generic [ref=e144]: 68/100
                        - generic [ref=e145]:
                          - generic [ref=e146]: →
                          - generic [ref=e147]: 0 pt
                          - generic [ref=e148]: 0%
                      - paragraph [ref=e149]:
                        - text: "Periodo precedente:"
                        - generic [ref=e150]: 68/100
                    - listitem [ref=e151]:
                      - paragraph [ref=e152]: Personale
                      - generic [ref=e153]:
                        - generic [ref=e154]: 50/100
                        - generic [ref=e155]:
                          - generic [ref=e156]: ↓
                          - generic [ref=e157]: "-40 pt"
                          - generic [ref=e158]: "-44,4%"
                      - paragraph [ref=e159]:
                        - text: "Periodo precedente:"
                        - generic [ref=e160]: 90/100
                    - listitem [ref=e161]:
                      - paragraph [ref=e162]: Produzione
                      - generic [ref=e163]:
                        - generic [ref=e164]: 74/100
                        - generic [ref=e165]:
                          - generic [ref=e166]: ↓
                          - generic [ref=e167]: "-8 pt"
                          - generic [ref=e168]: "-9,8%"
                      - paragraph [ref=e169]:
                        - text: "Periodo precedente:"
                        - generic [ref=e170]: 82/100
                - article [ref=e171]:
                  - heading "Sintesi calcolo" [level=3] [ref=e173]
                  - generic [ref=e175]:
                    - list [ref=e176]:
                      - listitem [ref=e177]:
                        - paragraph [ref=e178]: Media aree
                        - generic [ref=e179]:
                          - generic [ref=e180]: 52/100
                          - generic [ref=e181]:
                            - generic [ref=e182]: ↓
                            - generic [ref=e183]: "-11 pt"
                            - generic [ref=e184]: "-17,5%"
                        - paragraph [ref=e185]:
                          - text: "Periodo precedente:"
                          - generic [ref=e186]: 63/100
                      - listitem [ref=e187]:
                        - paragraph [ref=e188]: Penalità rischio
                        - generic [ref=e190]: −5
                        - paragraph [ref=e191]: Sullo stato attuale dell'officina.
                      - listitem [ref=e192]:
                        - paragraph [ref=e193]: Totale
                        - generic [ref=e194]:
                          - generic [ref=e195]: 47/100
                          - generic [ref=e196]:
                            - generic [ref=e197]: ↓
                            - generic [ref=e198]: "-11 pt"
                            - generic [ref=e199]: "-19%"
                        - paragraph [ref=e200]:
                          - text: "Periodo precedente:"
                          - generic [ref=e201]: 58/100
                    - generic [ref=e202]:
                      - generic [ref=e203]:
                        - heading "Target di riferimento" [level=4] [ref=e204]
                        - paragraph [ref=e205]: Punteggio basato sul raggiungimento dei target officina (90/100 per obiettivo raggiunto).
                      - button "Modifica target officina" [ref=e206] [cursor=pointer]:
                        - img [ref=e207]
                - article [ref=e209]:
                  - heading "Ha abbassato il punteggio" [level=3] [ref=e211]
                  - list [ref=e214]:
                    - listitem [ref=e215]:
                      - 'link "Vai alla fonte: Ritardo oltre 14 giorni dall''ingresso" [ref=e216] [cursor=pointer]':
                        - /url: /lavorazioni?focusLav=e2782185-c973-4a66-8e95-e19b28f08922
                        - generic [ref=e218]:
                          - generic [ref=e219]:
                            - paragraph [ref=e220]: Ritardo oltre 14 giorni dall'ingresso
                            - paragraph [ref=e221]: 5.3 lavorazioni in ritardo su 19 aperte · penalità −3 pt sul totale
                          - generic [ref=e222]: "-3"
                    - listitem [ref=e223]:
                      - 'link "Vai alla fonte: Assenze del team" [ref=e224] [cursor=pointer]':
                        - /url: /dipendenti
                        - generic [ref=e226]:
                          - generic [ref=e227]:
                            - paragraph [ref=e228]: Assenze del team
                            - paragraph [ref=e229]: 86.8% (prima 5.5%) · +1478.2% · valutazione 10.4/100 · peso 20% sul totale
                          - generic [ref=e230]: "-2"
                    - listitem [ref=e231]:
                      - 'link "Vai alla fonte: Lavori in attesa oltre la media" [ref=e232] [cursor=pointer]':
                        - /url: /lavorazioni?focusLav=ccb48d52-adda-4570-b710-0997a972f0c1
                        - generic [ref=e234]:
                          - generic [ref=e235]:
                            - paragraph [ref=e236]: Lavori in attesa oltre la media
                            - paragraph [ref=e237]: 3 lavorazioni ferme oltre la media di attesa · penalità −2 pt sul totale
                          - generic [ref=e238]: "-2"
                    - listitem [ref=e239]:
                      - 'link "Vai alla fonte: Fatturato emesso" [ref=e240] [cursor=pointer]':
                        - /url: /report
                        - generic [ref=e242]:
                          - generic [ref=e243]:
                            - paragraph [ref=e244]: Fatturato emesso
                            - paragraph [ref=e245]: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                          - generic [ref=e246]: "-1"
                    - listitem [ref=e247]:
                      - 'link "Vai alla fonte: Incassi registrati" [ref=e248] [cursor=pointer]':
                        - /url: /report
                        - generic [ref=e250]:
                          - generic [ref=e251]:
                            - paragraph [ref=e252]: Incassi registrati
                            - paragraph [ref=e253]: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                          - generic [ref=e254]: "-1"
                    - listitem [ref=e255]:
                      - 'link "Vai alla fonte: Preventivi preparati" [ref=e256] [cursor=pointer]':
                        - /url: /preventivi
                        - generic [ref=e258]:
                          - generic [ref=e259]:
                            - paragraph [ref=e260]: Preventivi preparati
                            - paragraph [ref=e261]: 0 (prima 1) · -100% · valutazione 5/100 · peso 4% sul totale · affidabilità bassa
                          - generic [ref=e262]: "-1"
                    - listitem [ref=e263]:
                      - 'link "Vai alla fonte: Pezzi usati sui lavori" [ref=e264] [cursor=pointer]':
                        - /url: /magazzino
                        - generic [ref=e266]:
                          - generic [ref=e267]:
                            - paragraph [ref=e268]: Pezzi usati sui lavori
                            - paragraph [ref=e269]: 8 (prima 18) · -55.6% · valutazione 18/100 · peso 18% sul totale
                          - generic [ref=e270]: "-1"
                    - listitem [ref=e271]:
                      - 'link "Vai alla fonte: Meno ore lavorate" [ref=e272] [cursor=pointer]':
                        - /url: /dipendenti
                        - generic [ref=e274]:
                          - generic [ref=e275]:
                            - paragraph [ref=e276]: Meno ore lavorate
                            - paragraph [ref=e277]: 471 h (prima 796 h) · -40.8% · valutazione 58.9/100 · peso 20% sul totale
                          - generic [ref=e278]: "-1"
                    - listitem [ref=e279]:
                      - 'link "Vai alla fonte: Anzianità media lavori aperti" [ref=e280] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e282]:
                          - generic [ref=e283]:
                            - paragraph [ref=e284]: Anzianità media lavori aperti
                            - paragraph [ref=e285]: 30.9 gg, uguale al periodo precedente · valutazione 81.6/100 · peso 36% sul totale
                          - generic [ref=e286]: "-1"
                    - listitem [ref=e287]:
                      - 'link "Vai alla fonte: Meno lavori chiusi" [ref=e288] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e290]:
                          - generic [ref=e291]:
                            - paragraph [ref=e292]: Meno lavori chiusi
                            - paragraph [ref=e293]: 31 (prima 65) · -52.3% · valutazione 55.8/100 · peso 39% sul totale
                          - generic [ref=e294]: "-1"
                    - listitem [ref=e295]:
                      - 'link "Vai alla fonte: Tempo sui lavori urgenti" [ref=e296] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e298]:
                          - generic [ref=e299]:
                            - paragraph [ref=e300]: Tempo sui lavori urgenti
                            - paragraph [ref=e301]: 7.8 gg, uguale al periodo precedente · valutazione 34.6/100 · peso 23% sul totale · affidabilità media
                          - generic [ref=e302]: "-1"
          - generic [ref=e305]:
            - button "Nascondi Brief operativo" [expanded] [ref=e307] [cursor=pointer]:
              - heading "Brief operativo" [level=2] [ref=e309]
              - img [ref=e311]
            - region "Brief operativo" [ref=e313]:
              - generic [ref=e316]:
                - generic [ref=e317]:
                  - group "Granularità periodo brief operativo" [ref=e319]:
                    - button "Giorno" [ref=e320] [cursor=pointer]
                    - button "Settimana" [pressed] [ref=e321] [cursor=pointer]
                    - button "Mese" [ref=e322] [cursor=pointer]
                  - group "Finestra temporale brief operativo" [ref=e324]:
                    - button "Corrente" [pressed] [ref=e325] [cursor=pointer]
                    - button "Sett. prec." [ref=e326] [cursor=pointer]
                - article [ref=e327]:
                  - heading "Lavorazioni" [level=3] [ref=e328]
                  - list [ref=e329]:
                    - listitem [ref=e330]:
                      - paragraph [ref=e331]: Lavorazioni chiuse
                      - generic [ref=e332]:
                        - generic [ref=e333]: "3"
                        - generic [ref=e334]:
                          - generic [ref=e335]: ↓
                          - generic [ref=e336]: "-7"
                          - generic [ref=e337]: "-70%"
                      - paragraph [ref=e338]: "Settimana precedente: 10"
                    - listitem [ref=e339]:
                      - paragraph [ref=e340]: Nuove lavorazioni aperte
                      - generic [ref=e341]:
                        - generic [ref=e342]: "5"
                        - generic [ref=e343]:
                          - generic [ref=e344]: ↓
                          - generic [ref=e345]: "-13"
                          - generic [ref=e346]: "-72,2%"
                      - paragraph [ref=e347]: "Settimana precedente: 18"
                    - listitem [ref=e348]:
                      - paragraph [ref=e349]: Tempo medio chiusura
                      - generic [ref=e350]:
                        - generic [ref=e351]: 4,7 gg
                        - generic [ref=e352]:
                          - generic [ref=e353]: ↑
                          - generic [ref=e354]: "-3 gg"
                          - generic [ref=e355]: "-39%"
                      - paragraph [ref=e356]: "Settimana precedente: 7,7 gg"
                - article [ref=e357]:
                  - heading "Personale" [level=3] [ref=e358]
                  - list [ref=e359]:
                    - listitem [ref=e360]:
                      - paragraph [ref=e361]: Ore di lavoro
                      - generic [ref=e362]:
                        - generic [ref=e363]: 120 h
                        - generic [ref=e364]:
                          - generic [ref=e365]: ↓
                          - generic [ref=e366]: "-74 h"
                          - generic [ref=e367]: "-38,1%"
                      - paragraph [ref=e368]: "Settimana precedente: 194 h"
                    - listitem [ref=e369]:
                      - paragraph [ref=e370]: Ore di assenza
                      - generic [ref=e371]:
                        - generic [ref=e372]: 0 h
                        - generic [ref=e373]:
                          - generic [ref=e374]: ↑
                          - generic [ref=e375]: "-6 h"
                          - generic [ref=e376]: "-100%"
                      - paragraph [ref=e377]: "Settimana precedente: 6 h"
                    - listitem [ref=e378]:
                      - paragraph [ref=e379]: Ore straordinarie
                      - generic [ref=e380]:
                        - generic [ref=e381]: 0 h
                        - generic [ref=e382]:
                          - generic [ref=e383]: →
                          - generic [ref=e384]: +0 h
                          - generic [ref=e385]: 0%
                      - paragraph [ref=e386]: "Settimana precedente: 0 h"
                - article [ref=e387]:
                  - heading "Ricambi" [level=3] [ref=e388]
                  - list [ref=e389]:
                    - listitem [ref=e390]:
                      - paragraph [ref=e391]: Pezzi in uscita
                      - generic [ref=e392]:
                        - generic [ref=e393]: "0"
                        - generic [ref=e394]:
                          - generic [ref=e395]: ↓
                          - generic [ref=e396]: "-1"
                          - generic [ref=e397]: "-100%"
                      - paragraph [ref=e398]: "Settimana precedente: 1"
                    - listitem [ref=e399]:
                      - paragraph [ref=e400]: Pezzi in ingresso
                      - generic [ref=e401]:
                        - generic [ref=e402]: "2"
                        - generic [ref=e403]:
                          - generic [ref=e404]: ↑
                          - generic [ref=e405]: "+1"
                          - generic [ref=e406]: +100%
                      - paragraph [ref=e407]: "Settimana precedente: 1"
                    - listitem [ref=e408]:
                      - paragraph [ref=e409]: Articoli sotto scorta
                      - generic [ref=e411]: "0"
                      - paragraph [ref=e412]: Quantità sotto la scorta minima
                - article [ref=e413]:
                  - heading "Amministrazione" [level=3] [ref=e414]
                  - list [ref=e415]:
                    - listitem [ref=e416]:
                      - paragraph [ref=e417]: Fatturato emesso
                      - generic [ref=e418]:
                        - generic [ref=e419]: 0 €
                        - generic [ref=e420]:
                          - generic [ref=e421]: →
                          - generic [ref=e422]: +0 €
                          - generic [ref=e423]: 0%
                      - paragraph [ref=e424]: "Settimana precedente: 0 €"
                    - listitem [ref=e425]:
                      - paragraph [ref=e426]: Incassi
                      - generic [ref=e427]:
                        - generic [ref=e428]: 0 €
                        - generic [ref=e429]:
                          - generic [ref=e430]: →
                          - generic [ref=e431]: +0 €
                          - generic [ref=e432]: 0%
                      - paragraph [ref=e433]: "Settimana precedente: 0 €"
                    - listitem [ref=e434]:
                      - paragraph [ref=e435]: Preventivi creati
                      - generic [ref=e436]:
                        - generic [ref=e437]: "0"
                        - generic [ref=e438]:
                          - generic [ref=e439]: →
                          - generic [ref=e440]: "+0"
                          - generic [ref=e441]: 0%
                      - paragraph [ref=e442]: "Settimana precedente: 0"
          - generic [ref=e445]:
            - button "Mostra Attività recenti" [ref=e447] [cursor=pointer]:
              - heading "Attività recenti" [level=2] [ref=e449]
              - img [ref=e451]
            - generic [ref=e454]:
              - article [ref=e455]:
                - heading [level=3] [ref=e456]: Lavorazioni
                - list [ref=e457]:
                  - listitem [ref=e458]:
                    - button [ref=e459] [cursor=pointer]:
                      - paragraph [ref=e460]: Cliente AUDIT-20260902-201440 · MARCA-AUDIT-20260902-201440 MOD-AUDIT-20260902-201440 · SCU-1440
                      - generic [ref=e461]:
                        - generic [ref=e462]: Ingresso
                        - generic [ref=e463]: Local Smoke Admin · 2 eventi · 02 set, 20:16
                  - listitem [ref=e464]:
                    - button [ref=e465] [cursor=pointer]:
                      - paragraph [ref=e466]: Cliente AUDIT-20260902-200821 · MARCA-AUDIT-20260902-200821 MOD-AUDIT-20260902-200821 · SCU-0821
                      - generic [ref=e467]:
                        - generic [ref=e468]: Ingresso
                        - generic [ref=e469]: Local Smoke Admin · 2 eventi · 02 set, 20:09
                  - listitem [ref=e470]:
                    - button [ref=e471] [cursor=pointer]:
                      - paragraph [ref=e472]: Cliente AUDIT-20260902-200218 · MARCA-AUDIT-20260902-200218 MOD-AUDIT-20260902-200218 · SCU-0218
                      - generic [ref=e473]:
                        - generic [ref=e474]: Ingresso
                        - generic [ref=e475]: Local Smoke Admin · 2 eventi · 02 set, 20:03
                  - listitem [ref=e476]:
                    - button [ref=e477] [cursor=pointer]:
                      - paragraph [ref=e478]: Cliente AUDIT-20260902-195540 · MARCA-AUDIT-20260902-195540 MOD-AUDIT-20260902-195540 · SCU-5540
                      - generic [ref=e479]:
                        - generic [ref=e480]: Ingresso
                        - generic [ref=e481]: Local Smoke Admin · 2 eventi · 02 set, 19:57
                  - listitem [ref=e482]:
                    - button [ref=e483] [cursor=pointer]:
                      - paragraph [ref=e484]: Cliente AUDIT-20260902-195315 · MARCA-AUDIT-20260902-195315 MOD-AUDIT-20260902-195315 · SCU-5315
                      - generic [ref=e485]:
                        - generic [ref=e486]: Ingresso
                        - generic [ref=e487]: Local Smoke Admin · 2 eventi · 02 set, 19:54
              - article [ref=e488]:
                - heading [level=3] [ref=e489]: Magazzino
                - list [ref=e490]:
                  - listitem [ref=e491]:
                    - button [ref=e492] [cursor=pointer]:
                      - paragraph [ref=e493]: AMS · Sensore Prossimità D18 con Connettore
                      - generic [ref=e494]:
                        - generic [ref=e495]: Ricambio inserito
                        - generic [ref=e496]: Giorgio Namoini · 02 set, 16:58
                  - listitem [ref=e497]:
                    - button [ref=e498] [cursor=pointer]:
                      - paragraph [ref=e499]: OMB · Sensore di Prossimità SN=8
                      - generic [ref=e500]:
                        - generic [ref=e501]: Ricambio aggiornato
                        - generic [ref=e502]: Giorgio Namoini · 02 set, 16:29
                  - listitem [ref=e503]:
                    - button [ref=e504] [cursor=pointer]:
                      - paragraph [ref=e505]: OMB · Sensore di Prossimità
                      - generic [ref=e506]:
                        - generic [ref=e507]: Ricambio inserito
                        - generic [ref=e508]: Giorgio Namoini · 02 set, 15:11
                  - listitem [ref=e509]:
                    - button [ref=e510] [cursor=pointer]:
                      - paragraph [ref=e511]: OMB · Sensore di Prossimità M30x1,5
                      - generic [ref=e512]:
                        - generic [ref=e513]: Ricambio inserito
                        - generic [ref=e514]: Giorgio Namoini · 02 set, 15:03
                  - listitem [ref=e515]:
                    - button [ref=e516] [cursor=pointer]:
                      - paragraph [ref=e517]: OMB · Cavo Pin 4 Poli
                      - generic [ref=e518]:
                        - generic [ref=e519]: Ricambio inserito
                        - generic [ref=e520]: Giorgio Namoini · 02 set, 15:02
              - article [ref=e521]:
                - heading [level=3] [ref=e522]: Preventivi e DDT
                - paragraph [ref=e523]: Nessuna attività recente.
              - article [ref=e524]:
                - heading [level=3] [ref=e525]: Fatturazione
                - paragraph [ref=e526]: Nessuna attività recente.
          - generic [ref=e529]:
            - button "Mostra Diario operativo" [ref=e531] [cursor=pointer]:
              - heading "Diario operativo" [level=2] [ref=e533]
              - img [ref=e535]
            - generic [ref=e539]:
              - generic [ref=e541]:
                - generic [ref=e542]:
                  - button [ref=e543] [cursor=pointer]:
                    - img [ref=e544]
                  - button [ref=e546] [cursor=pointer]:
                    - generic [ref=e547]: Agosto 2026
                    - img [ref=e548]
                  - button [ref=e550] [cursor=pointer]:
                    - img [ref=e551]
                - generic [ref=e553]:
                  - generic [ref=e554]: Lun
                  - generic [ref=e555]: Mar
                  - generic [ref=e556]: Mer
                  - generic [ref=e557]: Gio
                  - generic [ref=e558]: Ven
                  - generic [ref=e559]: Sab
                  - generic [ref=e560]: Dom
                - generic [ref=e561]:
                  - generic [ref=e562]:
                    - button [disabled]: "27"
                    - button [disabled]: "28"
                    - button [disabled]: "29"
                    - button [disabled]: "30"
                    - button [disabled]: "31"
                    - button [ref=e563] [cursor=pointer]: "1"
                    - button [ref=e564] [cursor=pointer]: "2"
                  - generic [ref=e565]:
                    - button [ref=e566] [cursor=pointer]: "3"
                    - button [ref=e567] [cursor=pointer]: "4"
                    - button [ref=e568] [cursor=pointer]: "5"
                    - button [ref=e569] [cursor=pointer]: "6"
                    - button [ref=e570] [cursor=pointer]: "7"
                    - button [ref=e571] [cursor=pointer]: "8"
                    - button [ref=e572] [cursor=pointer]: "9"
                  - generic [ref=e573]:
                    - button [ref=e574] [cursor=pointer]: "10"
                    - button [ref=e575] [cursor=pointer]: "11"
                    - button [ref=e576] [cursor=pointer]: "12"
                    - button [ref=e577] [cursor=pointer]: "13"
                    - button [ref=e578] [cursor=pointer]: "14"
                    - button [ref=e579] [cursor=pointer]: "15"
                    - button [ref=e580] [cursor=pointer]: "16"
                  - generic [ref=e581]:
                    - button [ref=e582] [cursor=pointer]: "17"
                    - button [ref=e583] [cursor=pointer]: "18"
                    - button [ref=e584] [cursor=pointer]: "19"
                    - button [ref=e585] [cursor=pointer]: "20"
                    - button [ref=e586] [cursor=pointer]: "21"
                    - button [ref=e587] [cursor=pointer]: "22"
                    - button [ref=e588] [cursor=pointer]: "23"
                  - generic [ref=e589]:
                    - button [ref=e590] [cursor=pointer]: "24"
                    - button [ref=e591] [cursor=pointer]: "25"
                    - button [ref=e592] [cursor=pointer]: "26"
                    - button [ref=e593] [cursor=pointer]: "27"
                    - button [ref=e594] [cursor=pointer]: "28"
                    - button [ref=e595] [cursor=pointer]: "29"
                    - button [ref=e596] [cursor=pointer]: "30"
                  - generic [ref=e597]:
                    - button [pressed] [ref=e598] [cursor=pointer]: "31"
                    - button [disabled] [pressed]: "1"
                    - button [disabled] [pressed]: "2"
                    - button [disabled] [pressed]: "3"
                    - button [disabled] [pressed]: "4"
                    - button [disabled] [pressed]: "5"
                    - button [disabled] [pressed]: "6"
              - generic [ref=e600]:
                - generic [ref=e601]:
                  - generic [ref=e602]:
                    - generic [ref=e603]: "31"
                    - generic [ref=e604]: lunedì
                  - textbox [ref=e606]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e607]:
                  - generic [ref=e608]:
                    - generic [ref=e609]: "1"
                    - generic [ref=e610]: martedì
                  - textbox [ref=e612]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e613]:
                  - generic [ref=e614]:
                    - generic [ref=e615]: "2"
                    - generic [ref=e616]: mercoledì
                  - textbox [ref=e618]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e619]:
                  - generic [ref=e620]:
                    - generic [ref=e621]: "3"
                    - generic [ref=e622]: giovedì
                  - textbox [ref=e624]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e625]:
                  - generic [ref=e626]:
                    - generic [ref=e627]: "4"
                    - generic [ref=e628]: venerdì
                  - textbox [ref=e630]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e631]:
                  - generic [ref=e632]:
                    - generic [ref=e633]: "5"
                    - generic [ref=e634]: sabato
                  - textbox [ref=e636]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e637]:
                  - generic [ref=e638]:
                    - generic [ref=e639]: "6"
                    - generic [ref=e640]: domenica
                  - textbox [ref=e642]:
                    - /placeholder: Assenze, guasti, imprevisti…
```

# Test source

```ts
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
> 194 |   await dialog.getByRole("button", { name: "Chiudi" }).click();
      |                                                        ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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
  262 |   expect(layout.ok, JSON.stringify(layout)).toBe(true);
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
```