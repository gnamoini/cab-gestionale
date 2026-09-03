# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-mobile-shell.spec.ts >> wide viewport with narrow content column uses mobile shell tier on dashboard
- Location: e2e\smoke\06-mobile-shell.spec.ts:26:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "mobile"
Received: "desktop"

Call Log:
- Timeout 12000ms exceeded while waiting on the predicate
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
        - heading "Dashboard" [level=1] [ref=e154]
        - generic [ref=e155]:
          - generic [ref=e157]:
            - generic [ref=e158]:
              - img "C.A.B." [ref=e160]
              - generic:
                - heading "Buonasera, Local" [level=2]
                - paragraph: Benvenuto nel gestionale officina.
            - time [ref=e161]:
              - generic [ref=e162]: Mercoledì
              - generic [ref=e163]:
                - generic [ref=e164]: "2"
                - generic [ref=e165]:
                  - text: settembre
                  - generic [ref=e166]: "2026"
          - generic [ref=e167]:
            - generic [ref=e171]:
              - button "Nascondi Stato operativo" [expanded] [ref=e173] [cursor=pointer]:
                - generic [ref=e174]:
                  - heading "Stato operativo" [level=2]
                  - generic [ref=e176]:
                    - generic [ref=e177]:
                      - img [ref=e178]
                      - generic: "47"
                    - generic [ref=e181]:
                      - paragraph [ref=e182]: 47/100
                      - paragraph [ref=e183]: Attenzione
                - img [ref=e185]
              - region "Stato operativo" [ref=e187]:
                - generic [ref=e190]:
                  - article [ref=e191]:
                    - heading "Andamento settimanale" [level=3] [ref=e193]
                    - img "Andamento settimanale dello stato operativo negli ultimi 6 mesi" [ref=e197]:
                      - generic [ref=e200]: "0"
                      - generic [ref=e202]: "50"
                      - generic [ref=e204]: "100"
                      - generic [ref=e207]: mar
                      - generic [ref=e208]: apr
                      - generic [ref=e209]: mag
                      - generic [ref=e210]: giu
                      - generic [ref=e211]: lug
                      - generic [ref=e212]: ago
                      - 'button "Settimana fino a 15 mar: 70 Buono" [ref=e213] [cursor=pointer]'
                      - 'button "Settimana fino a 22 mar: 69 Buono" [ref=e214] [cursor=pointer]'
                      - 'button "Settimana fino a 29 mar: 69 Buono" [ref=e215] [cursor=pointer]'
                      - 'button "Settimana fino a 5 apr: 69 Buono" [ref=e216] [cursor=pointer]'
                      - 'button "Settimana fino a 12 apr: 69 Buono" [ref=e217] [cursor=pointer]'
                      - 'button "Settimana fino a 19 apr: 69 Buono" [ref=e218] [cursor=pointer]'
                      - 'button "Settimana fino a 26 apr: 69 Buono" [ref=e219] [cursor=pointer]'
                      - 'button "Settimana fino a 3 mag: 69 Buono" [ref=e220] [cursor=pointer]'
                      - 'button "Settimana fino a 10 mag: 69 Buono" [ref=e221] [cursor=pointer]'
                      - 'button "Settimana fino a 17 mag: 69 Buono" [ref=e222] [cursor=pointer]'
                      - 'button "Settimana fino a 24 mag: 68 Buono" [ref=e223] [cursor=pointer]'
                      - 'button "Settimana fino a 31 mag: 59 Attenzione" [ref=e224] [cursor=pointer]'
                      - 'button "Settimana fino a 7 giu: 49 Attenzione" [ref=e225] [cursor=pointer]'
                      - 'button "Settimana fino a 14 giu: 53 Attenzione" [ref=e226] [cursor=pointer]'
                      - 'button "Settimana fino a 21 giu: 57 Attenzione" [ref=e227] [cursor=pointer]'
                      - 'button "Settimana fino a 28 giu: 58 Attenzione" [ref=e228] [cursor=pointer]'
                      - 'button "Settimana fino a 5 lug: 57 Attenzione" [ref=e229] [cursor=pointer]'
                      - 'button "Settimana fino a 12 lug: 56 Attenzione" [ref=e230] [cursor=pointer]'
                      - 'button "Settimana fino a 19 lug: 57 Attenzione" [ref=e231] [cursor=pointer]'
                      - 'button "Settimana fino a 26 lug: 59 Attenzione" [ref=e232] [cursor=pointer]'
                      - 'button "Settimana fino a 2 ago: 63 Buono" [ref=e233] [cursor=pointer]'
                      - 'button "Settimana fino a 9 ago: 65 Buono" [ref=e234] [cursor=pointer]'
                      - 'button "Settimana fino a 16 ago: 60 Buono" [ref=e235] [cursor=pointer]'
                      - 'button "Settimana fino a 23 ago: 54 Attenzione" [ref=e236] [cursor=pointer]'
                      - 'button "Settimana fino a 30 ago: 50 Attenzione" [ref=e237] [cursor=pointer]'
                      - 'button "Settimana fino a 6 set: 47 Attenzione" [ref=e238] [cursor=pointer]'
                  - article [ref=e239]:
                    - heading "Punteggio per area" [level=3] [ref=e241]
                    - list [ref=e243]:
                      - listitem [ref=e244]:
                        - paragraph [ref=e245]: Economico
                        - generic [ref=e246]:
                          - generic: 5/100
                          - generic [ref=e247]:
                            - generic [ref=e248]: →
                            - generic [ref=e249]: 0 pt
                            - generic [ref=e250]: 0%
                        - paragraph [ref=e251]:
                          - text: "Periodo precedente:"
                          - generic [ref=e252]: 5/100
                      - listitem [ref=e253]:
                        - paragraph [ref=e254]: Magazzino
                        - generic [ref=e255]:
                          - generic: 68/100
                          - generic [ref=e256]:
                            - generic [ref=e257]: →
                            - generic [ref=e258]: 0 pt
                            - generic [ref=e259]: 0%
                        - paragraph [ref=e260]:
                          - text: "Periodo precedente:"
                          - generic [ref=e261]: 68/100
                      - listitem [ref=e262]:
                        - paragraph [ref=e263]: Personale
                        - generic [ref=e264]:
                          - generic: 50/100
                          - generic [ref=e265]:
                            - generic [ref=e266]: ↓
                            - generic [ref=e267]: "-40 pt"
                            - generic [ref=e268]: "-44,4%"
                        - paragraph [ref=e269]:
                          - text: "Periodo precedente:"
                          - generic [ref=e270]: 90/100
                      - listitem [ref=e271]:
                        - paragraph [ref=e272]: Produzione
                        - generic [ref=e273]:
                          - generic: 74/100
                          - generic [ref=e274]:
                            - generic [ref=e275]: ↓
                            - generic [ref=e276]: "-8 pt"
                            - generic [ref=e277]: "-9,8%"
                        - paragraph [ref=e278]:
                          - text: "Periodo precedente:"
                          - generic [ref=e279]: 82/100
                  - article [ref=e280]:
                    - heading "Sintesi calcolo" [level=3] [ref=e282]
                    - generic [ref=e284]:
                      - list [ref=e285]:
                        - listitem [ref=e286]:
                          - paragraph [ref=e287]: Media aree
                          - generic [ref=e288]:
                            - generic: 52/100
                            - generic [ref=e289]:
                              - generic [ref=e290]: ↓
                              - generic [ref=e291]: "-11 pt"
                              - generic [ref=e292]: "-17,5%"
                          - paragraph [ref=e293]:
                            - text: "Periodo precedente:"
                            - generic [ref=e294]: 63/100
                        - listitem [ref=e295]:
                          - paragraph [ref=e296]: Penalità rischio
                          - generic [ref=e298]: −5
                          - paragraph [ref=e299]: Sullo stato attuale dell'officina.
                        - listitem [ref=e300]:
                          - paragraph [ref=e301]: Totale
                          - generic [ref=e302]:
                            - generic: 47/100
                            - generic [ref=e303]:
                              - generic [ref=e304]: ↓
                              - generic [ref=e305]: "-11 pt"
                              - generic [ref=e306]: "-19%"
                          - paragraph [ref=e307]:
                            - text: "Periodo precedente:"
                            - generic [ref=e308]: 58/100
                      - generic [ref=e309]:
                        - generic:
                          - heading "Target di riferimento" [level=4]
                          - paragraph: Punteggio basato sul raggiungimento dei target officina (90/100 per obiettivo raggiunto).
                        - button "Modifica target officina" [ref=e310] [cursor=pointer]:
                          - img [ref=e311]
                  - article [ref=e313]:
                    - heading "Ha abbassato il punteggio" [level=3] [ref=e315]
                    - list [ref=e318]:
                      - listitem [ref=e319]:
                        - 'link "Vai alla fonte: Ritardo oltre 14 giorni dall''ingresso" [ref=e320] [cursor=pointer]':
                          - /url: /lavorazioni?focusLav=e2782185-c973-4a66-8e95-e19b28f08922
                          - generic [ref=e322]:
                            - generic:
                              - paragraph: Ritardo oltre 14 giorni dall'ingresso
                              - paragraph: 5.3 lavorazioni in ritardo su 19 aperte · penalità −3 pt sul totale
                            - generic [ref=e323]: "-3"
                      - listitem [ref=e324]:
                        - 'link "Vai alla fonte: Assenze del team" [ref=e325] [cursor=pointer]':
                          - /url: /dipendenti
                          - generic [ref=e327]:
                            - generic:
                              - paragraph: Assenze del team
                              - paragraph: 86.8% (prima 5.5%) · +1478.2% · valutazione 10.4/100 · peso 20% sul totale
                            - generic [ref=e328]: "-2"
                      - listitem [ref=e329]:
                        - 'link "Vai alla fonte: Lavori in attesa oltre la media" [ref=e330] [cursor=pointer]':
                          - /url: /lavorazioni?focusLav=ccb48d52-adda-4570-b710-0997a972f0c1
                          - generic [ref=e332]:
                            - generic:
                              - paragraph: Lavori in attesa oltre la media
                              - paragraph: 3 lavorazioni ferme oltre la media di attesa · penalità −2 pt sul totale
                            - generic [ref=e333]: "-2"
                      - listitem [ref=e334]:
                        - 'link "Vai alla fonte: Fatturato emesso" [ref=e335] [cursor=pointer]':
                          - /url: /report
                          - generic [ref=e337]:
                            - generic:
                              - paragraph: Fatturato emesso
                              - paragraph: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                            - generic [ref=e338]: "-1"
                      - listitem [ref=e339]:
                        - 'link "Vai alla fonte: Incassi registrati" [ref=e340] [cursor=pointer]':
                          - /url: /report
                          - generic [ref=e342]:
                            - generic:
                              - paragraph: Incassi registrati
                              - paragraph: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                            - generic [ref=e343]: "-1"
                      - listitem [ref=e344]:
                        - 'link "Vai alla fonte: Preventivi preparati" [ref=e345] [cursor=pointer]':
                          - /url: /preventivi
                          - generic [ref=e347]:
                            - generic:
                              - paragraph: Preventivi preparati
                              - paragraph: 0 (prima 1) · -100% · valutazione 5/100 · peso 4% sul totale · affidabilità bassa
                            - generic [ref=e348]: "-1"
                      - listitem [ref=e349]:
                        - 'link "Vai alla fonte: Pezzi usati sui lavori" [ref=e350] [cursor=pointer]':
                          - /url: /magazzino
                          - generic [ref=e352]:
                            - generic:
                              - paragraph: Pezzi usati sui lavori
                              - paragraph: 8 (prima 18) · -55.6% · valutazione 18/100 · peso 18% sul totale
                            - generic [ref=e353]: "-1"
                      - listitem [ref=e354]:
                        - 'link "Vai alla fonte: Meno ore lavorate" [ref=e355] [cursor=pointer]':
                          - /url: /dipendenti
                          - generic [ref=e357]:
                            - generic:
                              - paragraph: Meno ore lavorate
                              - paragraph: 471 h (prima 796 h) · -40.8% · valutazione 58.9/100 · peso 20% sul totale
                            - generic [ref=e358]: "-1"
                      - listitem [ref=e359]:
                        - 'link "Vai alla fonte: Anzianità media lavori aperti" [ref=e360] [cursor=pointer]':
                          - /url: /lavorazioni
                          - generic [ref=e362]:
                            - generic:
                              - paragraph: Anzianità media lavori aperti
                              - paragraph: 30.9 gg, uguale al periodo precedente · valutazione 81.6/100 · peso 36% sul totale
                            - generic [ref=e363]: "-1"
                      - listitem [ref=e364]:
                        - 'link "Vai alla fonte: Meno lavori chiusi" [ref=e365] [cursor=pointer]':
                          - /url: /lavorazioni
                          - generic [ref=e367]:
                            - generic:
                              - paragraph: Meno lavori chiusi
                              - paragraph: 31 (prima 65) · -52.3% · valutazione 55.8/100 · peso 39% sul totale
                            - generic [ref=e368]: "-1"
                      - listitem [ref=e369]:
                        - 'link "Vai alla fonte: Tempo sui lavori urgenti" [ref=e370] [cursor=pointer]':
                          - /url: /lavorazioni
                          - generic [ref=e372]:
                            - generic:
                              - paragraph: Tempo sui lavori urgenti
                              - paragraph: 7.8 gg, uguale al periodo precedente · valutazione 34.6/100 · peso 23% sul totale · affidabilità media
                            - generic [ref=e373]: "-1"
            - generic [ref=e376]:
              - button "Nascondi Brief operativo" [expanded] [ref=e378] [cursor=pointer]:
                - heading "Brief operativo" [level=2] [ref=e380]
                - img [ref=e382]
              - region "Brief operativo" [ref=e384]:
                - generic [ref=e387]:
                  - generic [ref=e388]:
                    - group "Granularità periodo brief operativo" [ref=e390]:
                      - button "Giorno" [ref=e391] [cursor=pointer]
                      - button "Settimana" [pressed] [ref=e392] [cursor=pointer]
                      - button "Mese" [ref=e393] [cursor=pointer]
                    - group "Finestra temporale brief operativo" [ref=e395]:
                      - button "Corrente" [pressed] [ref=e396] [cursor=pointer]
                      - button "Sett. prec." [ref=e397] [cursor=pointer]
                  - article [ref=e398]:
                    - heading "Lavorazioni" [level=3] [ref=e399]
                    - list [ref=e400]:
                      - listitem [ref=e401]:
                        - paragraph [ref=e402]: Lavorazioni chiuse
                        - generic [ref=e403]:
                          - generic: "3"
                          - generic [ref=e404]:
                            - generic [ref=e405]: ↓
                            - generic [ref=e406]: "-7"
                            - generic [ref=e407]: "-70%"
                        - paragraph [ref=e408]: "Settimana precedente: 10"
                      - listitem [ref=e409]:
                        - paragraph [ref=e410]: Nuove lavorazioni aperte
                        - generic [ref=e411]:
                          - generic: "5"
                          - generic [ref=e412]:
                            - generic [ref=e413]: ↓
                            - generic [ref=e414]: "-13"
                            - generic [ref=e415]: "-72,2%"
                        - paragraph [ref=e416]: "Settimana precedente: 18"
                      - listitem [ref=e417]:
                        - paragraph [ref=e418]: Tempo medio chiusura
                        - generic [ref=e419]:
                          - generic: 4,7 gg
                          - generic [ref=e420]:
                            - generic [ref=e421]: ↑
                            - generic [ref=e422]: "-3 gg"
                            - generic [ref=e423]: "-39%"
                        - paragraph [ref=e424]: "Settimana precedente: 7,7 gg"
                  - article [ref=e425]:
                    - heading "Personale" [level=3] [ref=e426]
                    - list [ref=e427]:
                      - listitem [ref=e428]:
                        - paragraph [ref=e429]: Ore di lavoro
                        - generic [ref=e430]:
                          - generic: 120 h
                          - generic [ref=e431]:
                            - generic [ref=e432]: ↓
                            - generic [ref=e433]: "-74 h"
                            - generic [ref=e434]: "-38,1%"
                        - paragraph [ref=e435]: "Settimana precedente: 194 h"
                      - listitem [ref=e436]:
                        - paragraph [ref=e437]: Ore di assenza
                        - generic [ref=e438]:
                          - generic: 0 h
                          - generic [ref=e439]:
                            - generic [ref=e440]: ↑
                            - generic [ref=e441]: "-6 h"
                            - generic [ref=e442]: "-100%"
                        - paragraph [ref=e443]: "Settimana precedente: 6 h"
                      - listitem [ref=e444]:
                        - paragraph [ref=e445]: Ore straordinarie
                        - generic [ref=e446]:
                          - generic: 0 h
                          - generic [ref=e447]:
                            - generic [ref=e448]: →
                            - generic [ref=e449]: +0 h
                            - generic [ref=e450]: 0%
                        - paragraph [ref=e451]: "Settimana precedente: 0 h"
                  - article [ref=e452]:
                    - heading "Ricambi" [level=3] [ref=e453]
                    - list [ref=e454]:
                      - listitem [ref=e455]:
                        - paragraph [ref=e456]: Pezzi in uscita
                        - generic [ref=e457]:
                          - generic: "0"
                          - generic [ref=e458]:
                            - generic [ref=e459]: ↓
                            - generic [ref=e460]: "-1"
                            - generic [ref=e461]: "-100%"
                        - paragraph [ref=e462]: "Settimana precedente: 1"
                      - listitem [ref=e463]:
                        - paragraph [ref=e464]: Pezzi in ingresso
                        - generic [ref=e465]:
                          - generic: "2"
                          - generic [ref=e466]:
                            - generic [ref=e467]: ↑
                            - generic [ref=e468]: "+1"
                            - generic [ref=e469]: +100%
                        - paragraph [ref=e470]: "Settimana precedente: 1"
                      - listitem [ref=e471]:
                        - paragraph [ref=e472]: Articoli sotto scorta
                        - generic [ref=e474]: "0"
                        - paragraph [ref=e475]: Quantità sotto la scorta minima
                  - article [ref=e476]:
                    - heading "Amministrazione" [level=3] [ref=e477]
                    - list [ref=e478]:
                      - listitem [ref=e479]:
                        - paragraph [ref=e480]: Fatturato emesso
                        - generic [ref=e481]:
                          - generic: 0 €
                          - generic [ref=e482]:
                            - generic [ref=e483]: →
                            - generic [ref=e484]: +0 €
                            - generic [ref=e485]: 0%
                        - paragraph [ref=e486]: "Settimana precedente: 0 €"
                      - listitem [ref=e487]:
                        - paragraph [ref=e488]: Incassi
                        - generic [ref=e489]:
                          - generic: 0 €
                          - generic [ref=e490]:
                            - generic [ref=e491]: →
                            - generic [ref=e492]: +0 €
                            - generic [ref=e493]: 0%
                        - paragraph [ref=e494]: "Settimana precedente: 0 €"
                      - listitem [ref=e495]:
                        - paragraph [ref=e496]: Preventivi creati
                        - generic [ref=e497]:
                          - generic: "0"
                          - generic [ref=e498]:
                            - generic [ref=e499]: →
                            - generic [ref=e500]: "+0"
                            - generic [ref=e501]: 0%
                        - paragraph [ref=e502]: "Settimana precedente: 0"
            - generic [ref=e505]:
              - button "Mostra Attività recenti" [ref=e507] [cursor=pointer]:
                - heading "Attività recenti" [level=2] [ref=e509]
                - img [ref=e511]
              - generic [ref=e514]:
                - article [ref=e515]:
                  - heading [level=3] [ref=e516]: Lavorazioni
                  - list [ref=e517]:
                    - listitem [ref=e518]:
                      - button [ref=e519] [cursor=pointer]:
                        - generic [ref=e520]: Ingresso
                    - listitem [ref=e521]:
                      - button [ref=e522] [cursor=pointer]:
                        - generic [ref=e523]: Ingresso
                    - listitem [ref=e524]:
                      - button [ref=e525] [cursor=pointer]:
                        - generic [ref=e526]: Ingresso
                    - listitem [ref=e527]:
                      - button [ref=e528] [cursor=pointer]:
                        - generic [ref=e529]: Ingresso
                    - listitem [ref=e530]:
                      - button [ref=e531] [cursor=pointer]:
                        - generic [ref=e532]: Ingresso
                - article [ref=e533]:
                  - heading [level=3] [ref=e534]: Magazzino
                  - list [ref=e535]:
                    - listitem [ref=e536]:
                      - button [ref=e537] [cursor=pointer]:
                        - generic [ref=e538]: Ricambio inserito
                    - listitem [ref=e539]:
                      - button [ref=e540] [cursor=pointer]:
                        - generic [ref=e541]: Ricambio aggiornato
                    - listitem [ref=e542]:
                      - button [ref=e543] [cursor=pointer]:
                        - generic [ref=e544]: Ricambio inserito
                    - listitem [ref=e545]:
                      - button [ref=e546] [cursor=pointer]:
                        - generic [ref=e547]: Ricambio inserito
                    - listitem [ref=e548]:
                      - button [ref=e549] [cursor=pointer]:
                        - generic [ref=e550]: Ricambio inserito
                - article [ref=e551]:
                  - heading [level=3] [ref=e552]: Preventivi e DDT
                  - paragraph [ref=e553]: Nessuna attività recente.
                - article [ref=e554]:
                  - heading [level=3] [ref=e555]: Fatturazione
                  - paragraph [ref=e556]: Nessuna attività recente.
            - generic [ref=e559]:
              - button "Mostra Diario operativo" [ref=e561] [cursor=pointer]:
                - heading "Diario operativo" [level=2] [ref=e563]
                - img [ref=e565]
              - generic [ref=e569]:
                - generic [ref=e571]:
                  - button [ref=e572] [cursor=pointer]:
                    - img [ref=e573]
                  - button [ref=e575] [cursor=pointer]:
                    - img [ref=e576]
                  - button [ref=e578] [cursor=pointer]:
                    - img [ref=e579]
                - generic [ref=e588]:
                  - generic [ref=e590]:
                    - generic [ref=e591]: "31"
                    - generic [ref=e592]: lunedì
                  - generic [ref=e594]:
                    - generic [ref=e595]: "1"
                    - generic [ref=e596]: martedì
                  - generic [ref=e598]:
                    - generic [ref=e599]: "2"
                    - generic [ref=e600]: mercoledì
                  - generic [ref=e602]:
                    - generic [ref=e603]: "3"
                    - generic [ref=e604]: giovedì
                  - generic [ref=e606]:
                    - generic [ref=e607]: "4"
                    - generic [ref=e608]: venerdì
                  - generic [ref=e610]:
                    - generic [ref=e611]: "5"
                    - generic [ref=e612]: sabato
                  - generic [ref=e614]:
                    - generic [ref=e615]: "6"
                    - generic [ref=e616]: domenica
```

# Test source

```ts
  1  | import { attachConsoleGuards } from "../helpers/console";
  2  | import { auditHorizontalOverflow } from "../helpers/horizontal-overflow";
  3  | import { adminCredentials, loginViaUi } from "../fixtures/auth";
  4  | import { test, expect } from "@playwright/test";
  5  | 
  6  | const OVERFLOW_VIEWPORTS = [
  7  |   { width: 390, height: 844, label: "390" },
  8  |   { width: 724, height: 900, label: "724" },
  9  |   { width: 900, height: 900, label: "900" },
  10 |   { width: 1362, height: 900, label: "1362" },
  11 | ] as const;
  12 | 
  13 | for (const vp of OVERFLOW_VIEWPORTS) {
  14 |   test(`shell has no horizontal overflow on dashboard at ${vp.label}px`, async ({ page }) => {
  15 |     attachConsoleGuards(page);
  16 |     await page.setViewportSize({ width: vp.width, height: vp.height });
  17 |     await loginViaUi(page, adminCredentials());
  18 |     await page.goto("/dashboard");
  19 |     await expect(page.locator(".cab-app-shell")).toBeVisible({ timeout: 30_000 });
  20 | 
  21 |     const overflow = await auditHorizontalOverflow(page);
  22 |     expect(overflow.ok, JSON.stringify(overflow)).toBe(true);
  23 |   });
  24 | }
  25 | 
  26 | test("wide viewport with narrow content column uses mobile shell tier on dashboard", async ({ page }) => {
  27 |   attachConsoleGuards(page);
  28 |   await page.setViewportSize({ width: 1400, height: 900 });
  29 |   await loginViaUi(page, adminCredentials());
  30 |   await page.goto("/dashboard");
  31 | 
  32 |   await page.evaluate(() => {
  33 |     const shell = document.querySelector(".cab-app-shell");
  34 |     const col = document.querySelector(".cab-app-shell > div.flex-1");
  35 |     if (shell instanceof HTMLElement) {
  36 |       shell.style.width = "360px";
  37 |       shell.style.maxWidth = "360px";
  38 |     }
  39 |     if (col instanceof HTMLElement) {
  40 |       col.style.width = "360px";
  41 |       col.style.maxWidth = "360px";
  42 |     }
  43 |     window.dispatchEvent(new Event("resize"));
  44 |   });
  45 | 
  46 |   await expect
  47 |     .poll(async () => page.locator(".cab-app-shell").getAttribute("data-gestionale-shell-tier"))
> 48 |     .toBe("mobile");
     |      ^ Error: expect(received).toBe(expected) // Object.is equality
  49 | 
  50 |   await expect(page.getByTestId("smoke-nav-drawer-open")).toBeVisible();
  51 |   await expect(page.locator(".cab-sidebar")).toBeHidden();
  52 | 
  53 |   const kpiSection = page.locator('section[aria-label="Settimana corrente (lun–oggi)"]');
  54 |   await expect(kpiSection).toBeVisible({ timeout: 45_000 });
  55 |   const kpiGrid = kpiSection.locator(".grid").first();
  56 |   const columns = await kpiGrid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  57 |   expect(columns.split(" ").length).toBeLessThanOrEqual(1);
  58 | });
  59 | 
```