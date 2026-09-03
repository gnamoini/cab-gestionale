# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-auth.spec.ts >> login redirect and logout
- Location: e2e\smoke\01-auth.spec.ts:7:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByTestId('smoke-account-menu')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]: Dashboard · C.A.B. Gestionale Officina
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
          - heading "Dashboard" [level=1]
      - generic [ref=e44]:
        - generic [ref=e46]:
          - generic [ref=e47]:
            - img "C.A.B." [ref=e49]
            - generic [ref=e50]:
              - heading "Buonasera, Local" [level=2] [ref=e51]
              - paragraph [ref=e52]: Benvenuto nel gestionale officina.
          - time [ref=e53]:
            - generic [ref=e54]: Mercoledì
            - generic [ref=e55]:
              - generic [ref=e56]: "2"
              - generic [ref=e57]:
                - text: settembre
                - generic [ref=e58]: "2026"
        - generic [ref=e59]:
          - generic [ref=e63]:
            - button "Nascondi Stato operativo" [expanded] [ref=e65] [cursor=pointer]:
              - generic [ref=e66]:
                - heading "Stato operativo" [level=2] [ref=e67]
                - generic [ref=e69]:
                  - generic [ref=e70]:
                    - img [ref=e71]
                    - generic: "47"
                  - generic [ref=e74]:
                    - paragraph [ref=e75]: 47/100
                    - paragraph [ref=e76]: Attenzione
              - img [ref=e78]
            - region "Stato operativo" [ref=e80]:
              - generic [ref=e83]:
                - article [ref=e84]:
                  - heading "Andamento settimanale" [level=3] [ref=e86]
                  - img "Andamento settimanale dello stato operativo negli ultimi 6 mesi" [ref=e90]:
                    - generic [ref=e93]: "0"
                    - generic [ref=e95]: "50"
                    - generic [ref=e97]: "100"
                    - generic [ref=e100]: mar
                    - generic [ref=e101]: apr
                    - generic [ref=e102]: mag
                    - generic [ref=e103]: giu
                    - generic [ref=e104]: lug
                    - generic [ref=e105]: ago
                    - 'button "Settimana fino a 15 mar: 70 Buono" [ref=e106] [cursor=pointer]'
                    - 'button "Settimana fino a 22 mar: 69 Buono" [ref=e107] [cursor=pointer]'
                    - 'button "Settimana fino a 29 mar: 69 Buono" [ref=e108] [cursor=pointer]'
                    - 'button "Settimana fino a 5 apr: 69 Buono" [ref=e109] [cursor=pointer]'
                    - 'button "Settimana fino a 12 apr: 69 Buono" [ref=e110] [cursor=pointer]'
                    - 'button "Settimana fino a 19 apr: 69 Buono" [ref=e111] [cursor=pointer]'
                    - 'button "Settimana fino a 26 apr: 69 Buono" [ref=e112] [cursor=pointer]'
                    - 'button "Settimana fino a 3 mag: 69 Buono" [ref=e113] [cursor=pointer]'
                    - 'button "Settimana fino a 10 mag: 69 Buono" [ref=e114] [cursor=pointer]'
                    - 'button "Settimana fino a 17 mag: 69 Buono" [ref=e115] [cursor=pointer]'
                    - 'button "Settimana fino a 24 mag: 68 Buono" [ref=e116] [cursor=pointer]'
                    - 'button "Settimana fino a 31 mag: 59 Attenzione" [ref=e117] [cursor=pointer]'
                    - 'button "Settimana fino a 7 giu: 49 Attenzione" [ref=e118] [cursor=pointer]'
                    - 'button "Settimana fino a 14 giu: 53 Attenzione" [ref=e119] [cursor=pointer]'
                    - 'button "Settimana fino a 21 giu: 57 Attenzione" [ref=e120] [cursor=pointer]'
                    - 'button "Settimana fino a 28 giu: 58 Attenzione" [ref=e121] [cursor=pointer]'
                    - 'button "Settimana fino a 5 lug: 57 Attenzione" [ref=e122] [cursor=pointer]'
                    - 'button "Settimana fino a 12 lug: 56 Attenzione" [ref=e123] [cursor=pointer]'
                    - 'button "Settimana fino a 19 lug: 57 Attenzione" [ref=e124] [cursor=pointer]'
                    - 'button "Settimana fino a 26 lug: 59 Attenzione" [ref=e125] [cursor=pointer]'
                    - 'button "Settimana fino a 2 ago: 63 Buono" [ref=e126] [cursor=pointer]'
                    - 'button "Settimana fino a 9 ago: 65 Buono" [ref=e127] [cursor=pointer]'
                    - 'button "Settimana fino a 16 ago: 60 Buono" [ref=e128] [cursor=pointer]'
                    - 'button "Settimana fino a 23 ago: 54 Attenzione" [ref=e129] [cursor=pointer]'
                    - 'button "Settimana fino a 30 ago: 50 Attenzione" [ref=e130] [cursor=pointer]'
                    - 'button "Settimana fino a 6 set: 47 Attenzione" [ref=e131] [cursor=pointer]'
                - article [ref=e132]:
                  - heading "Punteggio per area" [level=3] [ref=e134]
                  - list [ref=e136]:
                    - listitem [ref=e137]:
                      - paragraph [ref=e138]: Economico
                      - generic [ref=e139]:
                        - generic [ref=e140]: 5/100
                        - generic [ref=e141]:
                          - generic [ref=e142]: →
                          - generic [ref=e143]: 0 pt
                          - generic [ref=e144]: 0%
                      - paragraph [ref=e145]:
                        - text: "Periodo precedente:"
                        - generic [ref=e146]: 5/100
                    - listitem [ref=e147]:
                      - paragraph [ref=e148]: Magazzino
                      - generic [ref=e149]:
                        - generic [ref=e150]: 68/100
                        - generic [ref=e151]:
                          - generic [ref=e152]: →
                          - generic [ref=e153]: 0 pt
                          - generic [ref=e154]: 0%
                      - paragraph [ref=e155]:
                        - text: "Periodo precedente:"
                        - generic [ref=e156]: 68/100
                    - listitem [ref=e157]:
                      - paragraph [ref=e158]: Personale
                      - generic [ref=e159]:
                        - generic [ref=e160]: 50/100
                        - generic [ref=e161]:
                          - generic [ref=e162]: ↓
                          - generic [ref=e163]: "-40 pt"
                          - generic [ref=e164]: "-44,4%"
                      - paragraph [ref=e165]:
                        - text: "Periodo precedente:"
                        - generic [ref=e166]: 90/100
                    - listitem [ref=e167]:
                      - paragraph [ref=e168]: Produzione
                      - generic [ref=e169]:
                        - generic [ref=e170]: 74/100
                        - generic [ref=e171]:
                          - generic [ref=e172]: ↓
                          - generic [ref=e173]: "-8 pt"
                          - generic [ref=e174]: "-9,8%"
                      - paragraph [ref=e175]:
                        - text: "Periodo precedente:"
                        - generic [ref=e176]: 82/100
                - article [ref=e177]:
                  - heading "Sintesi calcolo" [level=3] [ref=e179]
                  - generic [ref=e181]:
                    - list [ref=e182]:
                      - listitem [ref=e183]:
                        - paragraph [ref=e184]: Media aree
                        - generic [ref=e185]:
                          - generic [ref=e186]: 52/100
                          - generic [ref=e187]:
                            - generic [ref=e188]: ↓
                            - generic [ref=e189]: "-11 pt"
                            - generic [ref=e190]: "-17,5%"
                        - paragraph [ref=e191]:
                          - text: "Periodo precedente:"
                          - generic [ref=e192]: 63/100
                      - listitem [ref=e193]:
                        - paragraph [ref=e194]: Penalità rischio
                        - generic [ref=e196]: −5
                        - paragraph [ref=e197]: Sullo stato attuale dell'officina.
                      - listitem [ref=e198]:
                        - paragraph [ref=e199]: Totale
                        - generic [ref=e200]:
                          - generic [ref=e201]: 47/100
                          - generic [ref=e202]:
                            - generic [ref=e203]: ↓
                            - generic [ref=e204]: "-11 pt"
                            - generic [ref=e205]: "-19%"
                        - paragraph [ref=e206]:
                          - text: "Periodo precedente:"
                          - generic [ref=e207]: 58/100
                    - generic [ref=e208]:
                      - generic [ref=e209]:
                        - heading "Target di riferimento" [level=4] [ref=e210]
                        - paragraph [ref=e211]: Punteggio basato sul raggiungimento dei target officina (90/100 per obiettivo raggiunto).
                      - button "Modifica target officina" [ref=e212] [cursor=pointer]:
                        - img [ref=e213]
                - article [ref=e215]:
                  - heading "Ha abbassato il punteggio" [level=3] [ref=e217]
                  - list [ref=e220]:
                    - listitem [ref=e221]:
                      - 'link "Vai alla fonte: Ritardo oltre 14 giorni dall''ingresso" [ref=e222] [cursor=pointer]':
                        - /url: /lavorazioni?focusLav=e2782185-c973-4a66-8e95-e19b28f08922
                        - generic [ref=e224]:
                          - generic [ref=e225]:
                            - paragraph [ref=e226]: Ritardo oltre 14 giorni dall'ingresso
                            - paragraph [ref=e227]: 5.3 lavorazioni in ritardo su 19 aperte · penalità −3 pt sul totale
                          - generic [ref=e228]: "-3"
                    - listitem [ref=e229]:
                      - 'link "Vai alla fonte: Assenze del team" [ref=e230] [cursor=pointer]':
                        - /url: /dipendenti
                        - generic [ref=e232]:
                          - generic [ref=e233]:
                            - paragraph [ref=e234]: Assenze del team
                            - paragraph [ref=e235]: 86.8% (prima 5.5%) · +1478.2% · valutazione 10.4/100 · peso 20% sul totale
                          - generic [ref=e236]: "-2"
                    - listitem [ref=e237]:
                      - 'link "Vai alla fonte: Lavori in attesa oltre la media" [ref=e238] [cursor=pointer]':
                        - /url: /lavorazioni?focusLav=ccb48d52-adda-4570-b710-0997a972f0c1
                        - generic [ref=e240]:
                          - generic [ref=e241]:
                            - paragraph [ref=e242]: Lavori in attesa oltre la media
                            - paragraph [ref=e243]: 3 lavorazioni ferme oltre la media di attesa · penalità −2 pt sul totale
                          - generic [ref=e244]: "-2"
                    - listitem [ref=e245]:
                      - 'link "Vai alla fonte: Fatturato emesso" [ref=e246] [cursor=pointer]':
                        - /url: /report
                        - generic [ref=e248]:
                          - generic [ref=e249]:
                            - paragraph [ref=e250]: Fatturato emesso
                            - paragraph [ref=e251]: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                          - generic [ref=e252]: "-1"
                    - listitem [ref=e253]:
                      - 'link "Vai alla fonte: Incassi registrati" [ref=e254] [cursor=pointer]':
                        - /url: /report
                        - generic [ref=e256]:
                          - generic [ref=e257]:
                            - paragraph [ref=e258]: Incassi registrati
                            - paragraph [ref=e259]: 0 €, uguale al periodo precedente · valutazione 5/100 · peso 6% sul totale · affidabilità bassa
                          - generic [ref=e260]: "-1"
                    - listitem [ref=e261]:
                      - 'link "Vai alla fonte: Preventivi preparati" [ref=e262] [cursor=pointer]':
                        - /url: /preventivi
                        - generic [ref=e264]:
                          - generic [ref=e265]:
                            - paragraph [ref=e266]: Preventivi preparati
                            - paragraph [ref=e267]: 0 (prima 1) · -100% · valutazione 5/100 · peso 4% sul totale · affidabilità bassa
                          - generic [ref=e268]: "-1"
                    - listitem [ref=e269]:
                      - 'link "Vai alla fonte: Pezzi usati sui lavori" [ref=e270] [cursor=pointer]':
                        - /url: /magazzino
                        - generic [ref=e272]:
                          - generic [ref=e273]:
                            - paragraph [ref=e274]: Pezzi usati sui lavori
                            - paragraph [ref=e275]: 8 (prima 18) · -55.6% · valutazione 18/100 · peso 18% sul totale
                          - generic [ref=e276]: "-1"
                    - listitem [ref=e277]:
                      - 'link "Vai alla fonte: Meno ore lavorate" [ref=e278] [cursor=pointer]':
                        - /url: /dipendenti
                        - generic [ref=e280]:
                          - generic [ref=e281]:
                            - paragraph [ref=e282]: Meno ore lavorate
                            - paragraph [ref=e283]: 471 h (prima 796 h) · -40.8% · valutazione 58.9/100 · peso 20% sul totale
                          - generic [ref=e284]: "-1"
                    - listitem [ref=e285]:
                      - 'link "Vai alla fonte: Anzianità media lavori aperti" [ref=e286] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e288]:
                          - generic [ref=e289]:
                            - paragraph [ref=e290]: Anzianità media lavori aperti
                            - paragraph [ref=e291]: 30.9 gg, uguale al periodo precedente · valutazione 81.6/100 · peso 36% sul totale
                          - generic [ref=e292]: "-1"
                    - listitem [ref=e293]:
                      - 'link "Vai alla fonte: Meno lavori chiusi" [ref=e294] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e296]:
                          - generic [ref=e297]:
                            - paragraph [ref=e298]: Meno lavori chiusi
                            - paragraph [ref=e299]: 31 (prima 65) · -52.3% · valutazione 55.8/100 · peso 39% sul totale
                          - generic [ref=e300]: "-1"
                    - listitem [ref=e301]:
                      - 'link "Vai alla fonte: Tempo sui lavori urgenti" [ref=e302] [cursor=pointer]':
                        - /url: /lavorazioni
                        - generic [ref=e304]:
                          - generic [ref=e305]:
                            - paragraph [ref=e306]: Tempo sui lavori urgenti
                            - paragraph [ref=e307]: 7.8 gg, uguale al periodo precedente · valutazione 34.6/100 · peso 23% sul totale · affidabilità media
                          - generic [ref=e308]: "-1"
          - generic [ref=e311]:
            - button "Nascondi Brief operativo" [expanded] [ref=e313] [cursor=pointer]:
              - heading "Brief operativo" [level=2] [ref=e315]
              - img [ref=e317]
            - region "Brief operativo" [ref=e319]:
              - generic [ref=e322]:
                - generic [ref=e323]:
                  - group "Granularità periodo brief operativo" [ref=e325]:
                    - button "Giorno" [ref=e326] [cursor=pointer]
                    - button "Settimana" [pressed] [ref=e327] [cursor=pointer]
                    - button "Mese" [ref=e328] [cursor=pointer]
                  - group "Finestra temporale brief operativo" [ref=e330]:
                    - button "Corrente" [pressed] [ref=e331] [cursor=pointer]
                    - button "Sett. prec." [ref=e332] [cursor=pointer]
                - article [ref=e333]:
                  - heading "Lavorazioni" [level=3] [ref=e334]
                  - list [ref=e335]:
                    - listitem [ref=e336]:
                      - paragraph [ref=e337]: Lavorazioni chiuse
                      - generic [ref=e338]:
                        - generic [ref=e339]: "3"
                        - generic [ref=e340]:
                          - generic [ref=e341]: ↓
                          - generic [ref=e342]: "-7"
                          - generic [ref=e343]: "-70%"
                      - paragraph [ref=e344]: "Settimana precedente: 10"
                    - listitem [ref=e345]:
                      - paragraph [ref=e346]: Nuove lavorazioni aperte
                      - generic [ref=e347]:
                        - generic [ref=e348]: "5"
                        - generic [ref=e349]:
                          - generic [ref=e350]: ↓
                          - generic [ref=e351]: "-13"
                          - generic [ref=e352]: "-72,2%"
                      - paragraph [ref=e353]: "Settimana precedente: 18"
                    - listitem [ref=e354]:
                      - paragraph [ref=e355]: Tempo medio chiusura
                      - generic [ref=e356]:
                        - generic [ref=e357]: 4,7 gg
                        - generic [ref=e358]:
                          - generic [ref=e359]: ↑
                          - generic [ref=e360]: "-3 gg"
                          - generic [ref=e361]: "-39%"
                      - paragraph [ref=e362]: "Settimana precedente: 7,7 gg"
                - article [ref=e363]:
                  - heading "Personale" [level=3] [ref=e364]
                  - list [ref=e365]:
                    - listitem [ref=e366]:
                      - paragraph [ref=e367]: Ore di lavoro
                      - generic [ref=e368]:
                        - generic [ref=e369]: 120 h
                        - generic [ref=e370]:
                          - generic [ref=e371]: ↓
                          - generic [ref=e372]: "-74 h"
                          - generic [ref=e373]: "-38,1%"
                      - paragraph [ref=e374]: "Settimana precedente: 194 h"
                    - listitem [ref=e375]:
                      - paragraph [ref=e376]: Ore di assenza
                      - generic [ref=e377]:
                        - generic [ref=e378]: 0 h
                        - generic [ref=e379]:
                          - generic [ref=e380]: ↑
                          - generic [ref=e381]: "-6 h"
                          - generic [ref=e382]: "-100%"
                      - paragraph [ref=e383]: "Settimana precedente: 6 h"
                    - listitem [ref=e384]:
                      - paragraph [ref=e385]: Ore straordinarie
                      - generic [ref=e386]:
                        - generic [ref=e387]: 0 h
                        - generic [ref=e388]:
                          - generic [ref=e389]: →
                          - generic [ref=e390]: +0 h
                          - generic [ref=e391]: 0%
                      - paragraph [ref=e392]: "Settimana precedente: 0 h"
                - article [ref=e393]:
                  - heading "Ricambi" [level=3] [ref=e394]
                  - list [ref=e395]:
                    - listitem [ref=e396]:
                      - paragraph [ref=e397]: Pezzi in uscita
                      - generic [ref=e398]:
                        - generic [ref=e399]: "0"
                        - generic [ref=e400]:
                          - generic [ref=e401]: ↓
                          - generic [ref=e402]: "-1"
                          - generic [ref=e403]: "-100%"
                      - paragraph [ref=e404]: "Settimana precedente: 1"
                    - listitem [ref=e405]:
                      - paragraph [ref=e406]: Pezzi in ingresso
                      - generic [ref=e407]:
                        - generic [ref=e408]: "2"
                        - generic [ref=e409]:
                          - generic [ref=e410]: ↑
                          - generic [ref=e411]: "+1"
                          - generic [ref=e412]: +100%
                      - paragraph [ref=e413]: "Settimana precedente: 1"
                    - listitem [ref=e414]:
                      - paragraph [ref=e415]: Articoli sotto scorta
                      - generic [ref=e417]: "0"
                      - paragraph [ref=e418]: Quantità sotto la scorta minima
                - article [ref=e419]:
                  - heading "Amministrazione" [level=3] [ref=e420]
                  - list [ref=e421]:
                    - listitem [ref=e422]:
                      - paragraph [ref=e423]: Fatturato emesso
                      - generic [ref=e424]:
                        - generic [ref=e425]: 0 €
                        - generic [ref=e426]:
                          - generic [ref=e427]: →
                          - generic [ref=e428]: +0 €
                          - generic [ref=e429]: 0%
                      - paragraph [ref=e430]: "Settimana precedente: 0 €"
                    - listitem [ref=e431]:
                      - paragraph [ref=e432]: Incassi
                      - generic [ref=e433]:
                        - generic [ref=e434]: 0 €
                        - generic [ref=e435]:
                          - generic [ref=e436]: →
                          - generic [ref=e437]: +0 €
                          - generic [ref=e438]: 0%
                      - paragraph [ref=e439]: "Settimana precedente: 0 €"
                    - listitem [ref=e440]:
                      - paragraph [ref=e441]: Preventivi creati
                      - generic [ref=e442]:
                        - generic [ref=e443]: "0"
                        - generic [ref=e444]:
                          - generic [ref=e445]: →
                          - generic [ref=e446]: "+0"
                          - generic [ref=e447]: 0%
                      - paragraph [ref=e448]: "Settimana precedente: 0"
          - generic [ref=e451]:
            - button "Mostra Attività recenti" [ref=e453] [cursor=pointer]:
              - heading "Attività recenti" [level=2] [ref=e455]
              - img [ref=e457]
            - generic [ref=e460]:
              - article [ref=e461]:
                - heading [level=3] [ref=e462]: Lavorazioni
                - list [ref=e463]:
                  - listitem [ref=e464]:
                    - button [ref=e465] [cursor=pointer]:
                      - paragraph [ref=e466]: Cliente AUDIT-20260902-201440 · MARCA-AUDIT-20260902-201440 MOD-AUDIT-20260902-201440 · SCU-1440
                      - generic [ref=e467]:
                        - generic [ref=e468]: Ingresso
                        - generic [ref=e469]: Local Smoke Admin · 2 eventi · 02 set, 20:16
                  - listitem [ref=e470]:
                    - button [ref=e471] [cursor=pointer]:
                      - paragraph [ref=e472]: Cliente AUDIT-20260902-200821 · MARCA-AUDIT-20260902-200821 MOD-AUDIT-20260902-200821 · SCU-0821
                      - generic [ref=e473]:
                        - generic [ref=e474]: Ingresso
                        - generic [ref=e475]: Local Smoke Admin · 2 eventi · 02 set, 20:09
                  - listitem [ref=e476]:
                    - button [ref=e477] [cursor=pointer]:
                      - paragraph [ref=e478]: Cliente AUDIT-20260902-200218 · MARCA-AUDIT-20260902-200218 MOD-AUDIT-20260902-200218 · SCU-0218
                      - generic [ref=e479]:
                        - generic [ref=e480]: Ingresso
                        - generic [ref=e481]: Local Smoke Admin · 2 eventi · 02 set, 20:03
                  - listitem [ref=e482]:
                    - button [ref=e483] [cursor=pointer]:
                      - paragraph [ref=e484]: Cliente AUDIT-20260902-195540 · MARCA-AUDIT-20260902-195540 MOD-AUDIT-20260902-195540 · SCU-5540
                      - generic [ref=e485]:
                        - generic [ref=e486]: Ingresso
                        - generic [ref=e487]: Local Smoke Admin · 2 eventi · 02 set, 19:57
                  - listitem [ref=e488]:
                    - button [ref=e489] [cursor=pointer]:
                      - paragraph [ref=e490]: Cliente AUDIT-20260902-195315 · MARCA-AUDIT-20260902-195315 MOD-AUDIT-20260902-195315 · SCU-5315
                      - generic [ref=e491]:
                        - generic [ref=e492]: Ingresso
                        - generic [ref=e493]: Local Smoke Admin · 2 eventi · 02 set, 19:54
              - article [ref=e494]:
                - heading [level=3] [ref=e495]: Magazzino
                - list [ref=e496]:
                  - listitem [ref=e497]:
                    - button [ref=e498] [cursor=pointer]:
                      - paragraph [ref=e499]: AMS · Sensore Prossimità D18 con Connettore
                      - generic [ref=e500]:
                        - generic [ref=e501]: Ricambio inserito
                        - generic [ref=e502]: Giorgio Namoini · 02 set, 16:58
                  - listitem [ref=e503]:
                    - button [ref=e504] [cursor=pointer]:
                      - paragraph [ref=e505]: OMB · Sensore di Prossimità SN=8
                      - generic [ref=e506]:
                        - generic [ref=e507]: Ricambio aggiornato
                        - generic [ref=e508]: Giorgio Namoini · 02 set, 16:29
                  - listitem [ref=e509]:
                    - button [ref=e510] [cursor=pointer]:
                      - paragraph [ref=e511]: OMB · Sensore di Prossimità
                      - generic [ref=e512]:
                        - generic [ref=e513]: Ricambio inserito
                        - generic [ref=e514]: Giorgio Namoini · 02 set, 15:11
                  - listitem [ref=e515]:
                    - button [ref=e516] [cursor=pointer]:
                      - paragraph [ref=e517]: OMB · Sensore di Prossimità M30x1,5
                      - generic [ref=e518]:
                        - generic [ref=e519]: Ricambio inserito
                        - generic [ref=e520]: Giorgio Namoini · 02 set, 15:03
                  - listitem [ref=e521]:
                    - button [ref=e522] [cursor=pointer]:
                      - paragraph [ref=e523]: OMB · Cavo Pin 4 Poli
                      - generic [ref=e524]:
                        - generic [ref=e525]: Ricambio inserito
                        - generic [ref=e526]: Giorgio Namoini · 02 set, 15:02
              - article [ref=e527]:
                - heading [level=3] [ref=e528]: Preventivi e DDT
                - paragraph [ref=e529]: Nessuna attività recente.
              - article [ref=e530]:
                - heading [level=3] [ref=e531]: Fatturazione
                - paragraph [ref=e532]: Nessuna attività recente.
          - generic [ref=e535]:
            - button "Mostra Diario operativo" [ref=e537] [cursor=pointer]:
              - heading "Diario operativo" [level=2] [ref=e539]
              - img [ref=e541]
            - generic [ref=e545]:
              - generic [ref=e547]:
                - generic [ref=e548]:
                  - button [ref=e549] [cursor=pointer]:
                    - img [ref=e550]
                  - button [ref=e552] [cursor=pointer]:
                    - generic [ref=e553]: Agosto 2026
                    - img [ref=e554]
                  - button [ref=e556] [cursor=pointer]:
                    - img [ref=e557]
                - generic [ref=e559]:
                  - generic [ref=e560]: Lun
                  - generic [ref=e561]: Mar
                  - generic [ref=e562]: Mer
                  - generic [ref=e563]: Gio
                  - generic [ref=e564]: Ven
                  - generic [ref=e565]: Sab
                  - generic [ref=e566]: Dom
                - generic [ref=e567]:
                  - generic [ref=e568]:
                    - button [disabled]: "27"
                    - button [disabled]: "28"
                    - button [disabled]: "29"
                    - button [disabled]: "30"
                    - button [disabled]: "31"
                    - button [ref=e569] [cursor=pointer]: "1"
                    - button [ref=e570] [cursor=pointer]: "2"
                  - generic [ref=e571]:
                    - button [ref=e572] [cursor=pointer]: "3"
                    - button [ref=e573] [cursor=pointer]: "4"
                    - button [ref=e574] [cursor=pointer]: "5"
                    - button [ref=e575] [cursor=pointer]: "6"
                    - button [ref=e576] [cursor=pointer]: "7"
                    - button [ref=e577] [cursor=pointer]: "8"
                    - button [ref=e578] [cursor=pointer]: "9"
                  - generic [ref=e579]:
                    - button [ref=e580] [cursor=pointer]: "10"
                    - button [ref=e581] [cursor=pointer]: "11"
                    - button [ref=e582] [cursor=pointer]: "12"
                    - button [ref=e583] [cursor=pointer]: "13"
                    - button [ref=e584] [cursor=pointer]: "14"
                    - button [ref=e585] [cursor=pointer]: "15"
                    - button [ref=e586] [cursor=pointer]: "16"
                  - generic [ref=e587]:
                    - button [ref=e588] [cursor=pointer]: "17"
                    - button [ref=e589] [cursor=pointer]: "18"
                    - button [ref=e590] [cursor=pointer]: "19"
                    - button [ref=e591] [cursor=pointer]: "20"
                    - button [ref=e592] [cursor=pointer]: "21"
                    - button [ref=e593] [cursor=pointer]: "22"
                    - button [ref=e594] [cursor=pointer]: "23"
                  - generic [ref=e595]:
                    - button [ref=e596] [cursor=pointer]: "24"
                    - button [ref=e597] [cursor=pointer]: "25"
                    - button [ref=e598] [cursor=pointer]: "26"
                    - button [ref=e599] [cursor=pointer]: "27"
                    - button [ref=e600] [cursor=pointer]: "28"
                    - button [ref=e601] [cursor=pointer]: "29"
                    - button [ref=e602] [cursor=pointer]: "30"
                  - generic [ref=e603]:
                    - button [pressed] [ref=e604] [cursor=pointer]: "31"
                    - button [disabled] [pressed]: "1"
                    - button [disabled] [pressed]: "2"
                    - button [disabled] [pressed]: "3"
                    - button [disabled] [pressed]: "4"
                    - button [disabled] [pressed]: "5"
                    - button [disabled] [pressed]: "6"
              - generic [ref=e606]:
                - generic [ref=e607]:
                  - generic [ref=e608]:
                    - generic [ref=e609]: "31"
                    - generic [ref=e610]: lunedì
                  - textbox [ref=e612]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e613]:
                  - generic [ref=e614]:
                    - generic [ref=e615]: "1"
                    - generic [ref=e616]: martedì
                  - textbox [ref=e618]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e619]:
                  - generic [ref=e620]:
                    - generic [ref=e621]: "2"
                    - generic [ref=e622]: mercoledì
                  - textbox [ref=e624]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e625]:
                  - generic [ref=e626]:
                    - generic [ref=e627]: "3"
                    - generic [ref=e628]: giovedì
                  - textbox [ref=e630]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e631]:
                  - generic [ref=e632]:
                    - generic [ref=e633]: "4"
                    - generic [ref=e634]: venerdì
                  - textbox [ref=e636]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e637]:
                  - generic [ref=e638]:
                    - generic [ref=e639]: "5"
                    - generic [ref=e640]: sabato
                  - textbox [ref=e642]:
                    - /placeholder: Assenze, guasti, imprevisti…
                - generic [ref=e643]:
                  - generic [ref=e644]:
                    - generic [ref=e645]: "6"
                    - generic [ref=e646]: domenica
                  - textbox [ref=e648]:
                    - /placeholder: Assenze, guasti, imprevisti…
```

# Test source

```ts
  1   | import { test as base, expect, type Page } from "@playwright/test";
  2   | 
  3   | export type SmokeCredentials = {
  4   |   email: string;
  5   |   password: string;
  6   | };
  7   | 
  8   | export type LoginViaUiOptions = {
  9   |   /** Imposta checkbox "Resta collegato" prima del submit. */
  10  |   remember?: boolean;
  11  | };
  12  | 
  13  | export function adminCredentials(): SmokeCredentials {
  14  |   const email = process.env.SMOKE_ADMIN_EMAIL?.trim();
  15  |   const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  16  |   if (!email || !password) {
  17  |     throw new Error("SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required for Playwright smoke");
  18  |   }
  19  |   return { email, password };
  20  | }
  21  | 
  22  | export function adminUsernameCredentials(): SmokeCredentials | null {
  23  |   const username = process.env.SMOKE_ADMIN_USERNAME?.trim();
  24  |   const password = process.env.SMOKE_ADMIN_PASSWORD?.trim();
  25  |   if (!username || !password) return null;
  26  |   return { email: username, password };
  27  | }
  28  | 
  29  | export function operatorCredentials(): SmokeCredentials | null {
  30  |   const email = process.env.SMOKE_OPERATOR_EMAIL?.trim();
  31  |   const password = process.env.SMOKE_OPERATOR_PASSWORD?.trim();
  32  |   if (!email || !password) return null;
  33  |   return { email, password };
  34  | }
  35  | 
  36  | /** Alias env: SMOKE_OPERATORE_* (italiano) o SMOKE_OPERATOR_* */
  37  | export function operatoreCredentials(): SmokeCredentials | null {
  38  |   const email = (process.env.SMOKE_OPERATORE_EMAIL ?? process.env.SMOKE_OPERATOR_EMAIL)?.trim();
  39  |   const password = (process.env.SMOKE_OPERATORE_PASSWORD ?? process.env.SMOKE_OPERATOR_PASSWORD)?.trim();
  40  |   if (!email || !password) return null;
  41  |   return { email, password };
  42  | }
  43  | 
  44  | export function managerCredentials(): SmokeCredentials | null {
  45  |   const email = process.env.SMOKE_MANAGER_EMAIL?.trim();
  46  |   const password = process.env.SMOKE_MANAGER_PASSWORD?.trim();
  47  |   if (!email || !password) return null;
  48  |   return { email, password };
  49  | }
  50  | 
  51  | export function clientCredentials(): SmokeCredentials | null {
  52  |   const email = process.env.SMOKE_CLIENT_EMAIL?.trim();
  53  |   const password = process.env.SMOKE_CLIENT_PASSWORD?.trim();
  54  |   if (!email || !password) return null;
  55  |   return { email, password };
  56  | }
  57  | 
  58  | async function ensureAccountMenuVisible(page: Page): Promise<void> {
  59  |   const accountMenu = page.getByTestId("smoke-account-menu");
  60  |   if (await accountMenu.isVisible().catch(() => false)) return;
  61  |   const drawerOpen = page.getByTestId("smoke-nav-drawer-open");
  62  |   if (await drawerOpen.isVisible().catch(() => false)) {
  63  |     await drawerOpen.click({ timeout: 15_000 });
  64  |     await expect(page.getByRole("dialog", { name: "Menu principale" })).toBeVisible({ timeout: 10_000 });
  65  |     if (await accountMenu.isVisible().catch(() => false)) return;
  66  |   }
  67  |   await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 5_000 });
  68  | }
  69  | 
  70  | export async function loginViaUi(
  71  |   page: Page,
  72  |   creds: SmokeCredentials,
  73  |   opts?: LoginViaUiOptions,
  74  | ): Promise<void> {
  75  |   await expect(async () => {
  76  |     await page.goto("/login");
  77  |     const identifier = page.getByTestId("smoke-login-identifier");
  78  |     if (!(await identifier.isVisible().catch(() => false))) {
  79  |       await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
  80  |       return;
  81  |     }
  82  |     await expect(identifier).toBeEnabled({ timeout: 30_000 });
  83  |     const rememberCheckbox = page.getByRole("checkbox", { name: /resta collegato/i });
  84  |     if (opts?.remember === true) {
  85  |       await rememberCheckbox.check();
  86  |     } else if (opts?.remember === false) {
  87  |       await rememberCheckbox.uncheck();
  88  |     }
  89  |     await identifier.fill(creds.email);
  90  |     await page.getByTestId("smoke-login-password").fill(creds.password);
  91  |     await page.getByTestId("smoke-login-submit").click();
  92  |     // ponytail: client-side post-login redirect — no second domcontentloaded
  93  |     await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 60_000 });
  94  |   }).toPass({ timeout: 90_000 });
  95  | 
  96  |   await ensureAccountMenuVisible(page);
  97  | }
  98  | 
  99  | export async function logoutViaUi(page: Page): Promise<void> {
  100 |   await ensureAccountMenuVisible(page);
> 101 |   await page.getByTestId("smoke-account-menu").click();
      |                                                ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  102 |   await expect(page.getByTestId("profile-sheet")).toBeVisible({ timeout: 10_000 });
  103 |   await expect(page.getByTestId("smoke-logout")).toBeVisible({ timeout: 10_000 });
  104 |   const logout = page.getByTestId("smoke-logout");
  105 |   await logout.scrollIntoViewIfNeeded();
  106 |   await logout.click({ timeout: 20_000 });
  107 |   await expect(page.getByTestId("smoke-logout-confirm")).toBeVisible({ timeout: 10_000 });
  108 |   await page.getByTestId("smoke-logout-confirm").click();
  109 |   await page.waitForURL(/\/login/, { timeout: 30_000 });
  110 | }
  111 | 
  112 | export const test = base.extend<{ adminCreds: SmokeCredentials }>({
  113 |    
  114 |   adminCreds: async ({}, use) => {
  115 |     await use(adminCredentials());
  116 |   },
  117 | });
  118 | 
  119 | export { expect } from "@playwright/test";
  120 | 
```