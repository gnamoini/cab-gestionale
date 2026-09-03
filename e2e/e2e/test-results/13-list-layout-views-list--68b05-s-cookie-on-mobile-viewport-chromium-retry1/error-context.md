# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> list surface /lavorazioni: cards cookie on mobile viewport
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
          - heading "Lavorazioni" [level=1]
        - button "Azioni pagina" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e51]: Azioni pagina
      - generic [ref=e54]:
        - generic [ref=e55]:
          - region "Azioni e filtri lavorazioni (in corso e archivio)" [ref=e59]:
            - generic [ref=e61]:
              - generic [ref=e62]:
                - generic [ref=e65]:
                  - generic:
                    - img
                  - searchbox "Cerca in lavorazioni in corso e archivio" [ref=e66]
                - generic [ref=e67]:
                  - generic [ref=e69]:
                    - button "Nuova" [ref=e70] [cursor=pointer]:
                      - generic [ref=e71]:
                        - img [ref=e72]
                        - generic [ref=e74]: Nuova
                    - button "Acquisizione digitale schede" [ref=e75] [cursor=pointer]:
                      - img [ref=e77]
                      - generic [ref=e79]: AI
                  - button "Filtri" [ref=e81] [cursor=pointer]:
                    - img [ref=e82]
              - generic [ref=e86]:
                - generic [ref=e90]:
                  - generic [ref=e91]: "165"
                  - generic [ref=e92]: risultati
                - switch "Kanban" [ref=e94] [cursor=pointer]:
                  - generic [ref=e95]: Kanban
          - button "Choose File" [ref=e98]
        - generic [ref=e100]:
          - button "Nascondi Lavorazioni in corso (19)" [expanded] [ref=e102] [cursor=pointer]:
            - heading "Lavorazioni in corso (19)" [level=2] [ref=e104]
            - img [ref=e106]
          - region "Lavorazioni in corso (19)" [ref=e108]:
            - generic [ref=e111]:
              - generic [ref=e112]:
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - generic [ref=e115]:
                      - paragraph [ref=e116]: Oggetto
                      - paragraph [ref=e117]: Nextra K-MD24T
                    - generic [ref=e118]:
                      - paragraph [ref=e119]: Ingresso
                      - generic [ref=e121]:
                        - generic [ref=e122]: 05/03/2026
                        - generic [ref=e123]: 182 giorni
                  - generic [ref=e124]:
                    - generic [ref=e125]:
                      - paragraph [ref=e126]: Cliente
                      - paragraph [ref=e127]: Recuperi Pugliesi
                    - generic [ref=e128]:
                      - paragraph [ref=e129]: Cantiere
                      - paragraph [ref=e130]: Modugno
                  - generic [ref=e131]:
                    - generic [ref=e132]:
                      - paragraph [ref=e133]: Targa
                      - paragraph [ref=e134]: ET897CD
                    - generic [ref=e135]:
                      - paragraph [ref=e136]: Matricola
                      - paragraph [ref=e137]: 386/213
                - group "Stato, priorità e addetto" [ref=e138]:
                  - generic [ref=e139]:
                    - generic: Stato
                    - button "Stato — Nextra K-MD24T" [ref=e143] [cursor=pointer]:
                      - generic [ref=e144]: Attesa Ricambi
                      - img [ref=e145]
                  - generic [ref=e147]:
                    - generic: Priorità
                    - button "Priorità — Nextra K-MD24T" [ref=e151] [cursor=pointer]:
                      - generic [ref=e152]: Bassa
                      - img [ref=e153]
                  - generic [ref=e155]:
                    - generic: Addetto
                    - button "Addetto — Nextra K-MD24T" [ref=e159] [cursor=pointer]:
                      - generic [ref=e160]: Vito Polieri
                      - img [ref=e161]
                - group "Ultimo aggiornamento e azioni" [ref=e163]:
                  - generic [ref=e165]:
                    - paragraph [ref=e166]:
                      - generic [ref=e167]: "Ultimo aggiornamento:"
                      - text: 02/09/2026 · 16:17
                    - paragraph [ref=e168]: Giorgio Namoini
                  - generic [ref=e169]:
                    - button "Concludi" [ref=e170] [cursor=pointer]:
                      - img [ref=e171]
                    - button "Informazioni" [ref=e173] [cursor=pointer]:
                      - img [ref=e174]
                    - button "Schede" [ref=e176] [cursor=pointer]:
                      - img [ref=e177]
                      - generic: 3/3
              - generic [ref=e179]:
                - generic [ref=e180]:
                  - generic [ref=e181]:
                    - generic [ref=e182]:
                      - paragraph [ref=e183]: Oggetto
                      - paragraph [ref=e184]: Schmidt AS750
                    - generic [ref=e185]:
                      - paragraph [ref=e186]: Ingresso
                      - generic [ref=e188]:
                        - generic [ref=e189]: 07/05/2026
                        - generic [ref=e190]: 119 giorni
                  - generic [ref=e191]:
                    - generic [ref=e192]:
                      - paragraph [ref=e193]: Cliente
                      - paragraph [ref=e194]: A.M.
                    - generic [ref=e195]:
                      - paragraph [ref=e196]: Cantiere
                      - paragraph [ref=e197]: Mungivacca
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: Matricola
                    - paragraph [ref=e201]: AMBN203
                - group "Stato, priorità e addetto" [ref=e202]:
                  - generic [ref=e203]:
                    - generic: Stato
                    - button "Stato — Schmidt AS750" [ref=e207] [cursor=pointer]:
                      - generic [ref=e208]: Accettazione
                      - img [ref=e209]
                  - generic [ref=e211]:
                    - generic: Priorità
                    - button "Priorità — Schmidt AS750" [ref=e215] [cursor=pointer]:
                      - generic [ref=e216]: Bassa
                      - img [ref=e217]
                  - generic [ref=e219]:
                    - generic: Addetto
                    - button "Addetto — Schmidt AS750" [ref=e223] [cursor=pointer]:
                      - generic [ref=e224]: Mino Barbone
                      - img [ref=e225]
                - group "Ultimo aggiornamento e azioni" [ref=e227]:
                  - generic [ref=e229]:
                    - paragraph [ref=e230]:
                      - generic [ref=e231]: "Ultimo aggiornamento:"
                      - text: 06/08/2026 · 03:41
                    - paragraph [ref=e232]: Vito Namoini
                  - generic [ref=e233]:
                    - button "Concludi" [ref=e234] [cursor=pointer]:
                      - img [ref=e235]
                    - button "Informazioni" [ref=e237] [cursor=pointer]:
                      - img [ref=e238]
                    - button "Schede" [ref=e240] [cursor=pointer]:
                      - img [ref=e241]
                      - generic: 1/3
              - generic [ref=e243]:
                - generic [ref=e244]:
                  - generic [ref=e245]:
                    - generic [ref=e246]:
                      - paragraph [ref=e247]: Oggetto
                      - paragraph [ref=e248]: Cassa con Gru MEC CL.120.83.1Z1
                    - generic [ref=e249]:
                      - paragraph [ref=e250]: Ingresso
                      - generic [ref=e252]:
                        - generic [ref=e253]: 22/05/2026
                        - generic [ref=e254]: 104 giorni
                  - generic [ref=e255]:
                    - generic [ref=e256]:
                      - paragraph [ref=e257]: Cliente
                      - paragraph [ref=e258]: EcoAmbiente Sud
                    - generic [ref=e259]:
                      - paragraph [ref=e260]: Cantiere
                      - paragraph [ref=e261]: Fasano
                  - generic [ref=e263]:
                    - paragraph [ref=e264]: Matricola
                    - paragraph [ref=e265]: "70188038"
                - group "Stato, priorità e addetto" [ref=e266]:
                  - generic [ref=e267]:
                    - generic: Stato
                    - button "Stato — Cassa con Gru MEC CL.120.83.1Z1" [ref=e271] [cursor=pointer]:
                      - generic [ref=e272]: Attesa Ricambi
                      - img [ref=e273]
                  - generic [ref=e275]:
                    - generic: Priorità
                    - button "Priorità — Cassa con Gru MEC CL.120.83.1Z1" [ref=e279] [cursor=pointer]:
                      - generic [ref=e280]: Bassa
                      - img [ref=e281]
                  - generic [ref=e283]:
                    - generic: Addetto
                    - button "Addetto — Cassa con Gru MEC CL.120.83.1Z1" [ref=e287] [cursor=pointer]:
                      - generic [ref=e288]: Angelo Morino
                      - img [ref=e289]
                - group "Ultimo aggiornamento e azioni" [ref=e291]:
                  - generic [ref=e293]:
                    - paragraph [ref=e294]:
                      - generic [ref=e295]: "Ultimo aggiornamento:"
                      - text: 06/08/2026 · 03:41
                    - paragraph [ref=e296]: Vito Namoini
                  - generic [ref=e297]:
                    - button "Concludi" [ref=e298] [cursor=pointer]:
                      - img [ref=e299]
                    - button "Informazioni" [ref=e301] [cursor=pointer]:
                      - img [ref=e302]
                    - button "Schede" [ref=e304] [cursor=pointer]:
                      - img [ref=e305]
                      - generic: 1/3
              - generic [ref=e307]:
                - generic [ref=e308]:
                  - generic [ref=e309]:
                    - generic [ref=e310]:
                      - paragraph [ref=e311]: Oggetto
                      - paragraph [ref=e312]: Spazzatrice Sicas NA4m3
                    - generic [ref=e313]:
                      - paragraph [ref=e314]: Ingresso
                      - generic [ref=e316]:
                        - generic [ref=e317]: 24/07/2026
                        - generic [ref=e318]: 41 giorni
                  - generic [ref=e319]:
                    - generic [ref=e320]:
                      - paragraph [ref=e321]: Cliente
                      - paragraph [ref=e322]: Teknoservice
                    - generic [ref=e323]:
                      - paragraph [ref=e324]: Cantiere
                      - paragraph [ref=e325]: Altamura - Ba
                  - generic [ref=e326]:
                    - generic [ref=e327]:
                      - paragraph [ref=e328]: Scuderia
                      - paragraph [ref=e329]: 4C0233
                    - generic [ref=e330]:
                      - paragraph [ref=e331]: Targa
                      - paragraph [ref=e332]: AHS601
                - group "Stato, priorità e addetto" [ref=e333]:
                  - generic [ref=e334]:
                    - generic: Stato
                    - button "Stato — Spazzatrice Sicas NA4m3" [ref=e338] [cursor=pointer]:
                      - generic [ref=e339]: Attesa Ricambi
                      - img [ref=e340]
                  - generic [ref=e342]:
                    - generic: Priorità
                    - button "Priorità — Spazzatrice Sicas NA4m3" [ref=e346] [cursor=pointer]:
                      - generic [ref=e347]: Alta
                      - img [ref=e348]
                  - generic [ref=e350]:
                    - generic: Addetto
                    - button "Addetto — Spazzatrice Sicas NA4m3" [ref=e354] [cursor=pointer]:
                      - generic [ref=e355]: Angelo Morino
                      - img [ref=e356]
                - group "Ultimo aggiornamento e azioni" [ref=e358]:
                  - generic [ref=e360]:
                    - paragraph [ref=e361]:
                      - generic [ref=e362]: "Ultimo aggiornamento:"
                      - text: 28/08/2026 · 13:19
                    - paragraph [ref=e363]: Vito Namoini
                  - generic [ref=e364]:
                    - button "Concludi" [ref=e365] [cursor=pointer]:
                      - img [ref=e366]
                    - button "Informazioni" [ref=e368] [cursor=pointer]:
                      - img [ref=e369]
                    - button "Schede" [ref=e371] [cursor=pointer]:
                      - img [ref=e372]
                      - generic: 1/3
              - generic [ref=e374]:
                - generic [ref=e375]:
                  - generic [ref=e376]:
                    - generic [ref=e377]:
                      - paragraph [ref=e378]: Oggetto
                      - paragraph [ref=e379]: BTE CSM24B500D
                    - generic [ref=e380]:
                      - paragraph [ref=e381]: Ingresso
                      - generic [ref=e383]:
                        - generic [ref=e384]: 29/07/2026
                        - generic [ref=e385]: 36 giorni
                  - generic [ref=e386]:
                    - generic [ref=e387]:
                      - paragraph [ref=e388]: Cliente
                      - paragraph [ref=e389]: Bianco Igiene Ambientale
                    - generic [ref=e390]:
                      - paragraph [ref=e391]: Cantiere
                      - paragraph [ref=e392]: Ostuni
                  - generic [ref=e394]:
                    - paragraph [ref=e395]: Matricola
                    - paragraph [ref=e396]: 19P0656
                - group "Stato, priorità e addetto" [ref=e397]:
                  - generic [ref=e398]:
                    - generic: Stato
                    - button "Stato — BTE CSM24B500D" [ref=e402] [cursor=pointer]:
                      - generic [ref=e403]: Accettazione
                      - img [ref=e404]
                  - generic [ref=e406]:
                    - generic: Priorità
                    - button "Priorità — BTE CSM24B500D" [ref=e410] [cursor=pointer]:
                      - generic [ref=e411]: Bassa
                      - img [ref=e412]
                  - generic [ref=e414]:
                    - generic: Addetto
                    - button "Addetto — BTE CSM24B500D" [ref=e418] [cursor=pointer]:
                      - generic [ref=e419]: Mino Barbone
                      - img [ref=e420]
                - group "Ultimo aggiornamento e azioni" [ref=e422]:
                  - generic [ref=e424]:
                    - paragraph [ref=e425]:
                      - generic [ref=e426]: "Ultimo aggiornamento:"
                      - text: 26/08/2026 · 18:02
                    - paragraph [ref=e427]: Vito Namoini
                  - generic [ref=e428]:
                    - button "Concludi" [ref=e429] [cursor=pointer]:
                      - img [ref=e430]
                    - button "Informazioni" [ref=e432] [cursor=pointer]:
                      - img [ref=e433]
                    - button "Schede" [ref=e435] [cursor=pointer]:
                      - img [ref=e436]
                      - generic: 1/3
              - generic [ref=e438]:
                - generic [ref=e439]:
                  - generic [ref=e440]:
                    - generic [ref=e441]:
                      - paragraph [ref=e442]: Oggetto
                      - paragraph [ref=e443]: Compattatore Longo
                    - generic [ref=e444]:
                      - paragraph [ref=e445]: Ingresso
                      - generic [ref=e447]:
                        - generic [ref=e448]: 03/08/2026
                        - generic [ref=e449]: 31 giorni
                  - generic [ref=e450]:
                    - generic [ref=e451]:
                      - paragraph [ref=e452]: Cliente
                      - paragraph [ref=e453]: AMIU Bari
                    - generic [ref=e454]:
                      - paragraph [ref=e455]: Cantiere
                      - paragraph [ref=e456]: Bari
                  - generic [ref=e457]:
                    - generic [ref=e458]:
                      - paragraph [ref=e459]: Scuderia
                      - paragraph [ref=e460]: "1279"
                    - generic [ref=e461]:
                      - paragraph [ref=e462]: Targa
                      - paragraph [ref=e463]: FK012MM
                    - generic [ref=e464]:
                      - paragraph [ref=e465]: Matricola
                      - paragraph [ref=e466]: 165/340
                - group "Stato, priorità e addetto" [ref=e467]:
                  - generic [ref=e468]:
                    - generic: Stato
                    - button "Stato — Compattatore Longo" [ref=e472] [cursor=pointer]:
                      - generic [ref=e473]: In Lavorazione
                      - img [ref=e474]
                  - generic [ref=e476]:
                    - generic: Priorità
                    - button "Priorità — Compattatore Longo" [ref=e480] [cursor=pointer]:
                      - generic [ref=e481]: Media
                      - img [ref=e482]
                  - generic [ref=e484]:
                    - generic: Addetto
                    - button "Addetto — Compattatore Longo" [ref=e488] [cursor=pointer]:
                      - generic [ref=e489]: Donato Macina
                      - img [ref=e490]
                - group "Ultimo aggiornamento e azioni" [ref=e492]:
                  - generic [ref=e494]:
                    - paragraph [ref=e495]:
                      - generic [ref=e496]: "Ultimo aggiornamento:"
                      - text: 28/08/2026 · 13:21
                    - paragraph [ref=e497]: Vito Namoini
                  - generic [ref=e498]:
                    - button "Concludi" [ref=e499] [cursor=pointer]:
                      - img [ref=e500]
                    - button "Informazioni" [ref=e502] [cursor=pointer]:
                      - img [ref=e503]
                    - button "Schede" [ref=e505] [cursor=pointer]:
                      - img [ref=e506]
                      - generic: 1/3
              - generic [ref=e508]:
                - generic [ref=e509]:
                  - generic [ref=e510]:
                    - generic [ref=e511]:
                      - paragraph [ref=e512]: Oggetto
                      - paragraph [ref=e513]: Cilindro idraulico Doppstadt
                    - generic [ref=e514]:
                      - paragraph [ref=e515]: Ingresso
                      - generic [ref=e517]:
                        - generic [ref=e518]: 24/08/2026
                        - generic [ref=e519]: 10 giorni
                  - generic [ref=e520]:
                    - generic [ref=e521]:
                      - paragraph [ref=e522]: Cliente
                      - paragraph [ref=e523]: AVR per l'Ambiente
                    - generic [ref=e524]:
                      - paragraph [ref=e525]: Cantiere
                      - paragraph [ref=e526]: Acquaviva delle Fonti
                - group "Stato, priorità e addetto" [ref=e527]:
                  - generic [ref=e528]:
                    - generic: Stato
                    - button "Stato — Cilindro idraulico Doppstadt" [ref=e532] [cursor=pointer]:
                      - generic [ref=e533]: Attesa Preventivo
                      - img [ref=e534]
                  - generic [ref=e536]:
                    - generic: Priorità
                    - button "Priorità — Cilindro idraulico Doppstadt" [ref=e540] [cursor=pointer]:
                      - generic [ref=e541]: Media
                      - img [ref=e542]
                  - generic [ref=e544]:
                    - generic: Addetto
                    - button "Addetto — Cilindro idraulico Doppstadt" [ref=e548] [cursor=pointer]:
                      - generic [ref=e549]: Angelo Morino
                      - img [ref=e550]
                - group "Ultimo aggiornamento e azioni" [ref=e552]:
                  - generic [ref=e554]:
                    - paragraph [ref=e555]:
                      - generic [ref=e556]: "Ultimo aggiornamento:"
                      - text: 25/08/2026 · 09:27
                    - paragraph [ref=e557]: Vito Namoini
                  - generic [ref=e558]:
                    - button "Concludi" [ref=e559] [cursor=pointer]:
                      - img [ref=e560]
                    - button "Informazioni" [ref=e562] [cursor=pointer]:
                      - img [ref=e563]
                    - button "Schede" [ref=e565] [cursor=pointer]:
                      - img [ref=e566]
                      - generic: 1/3
              - generic [ref=e568]:
                - generic [ref=e569]:
                  - generic [ref=e570]:
                    - generic [ref=e571]:
                      - paragraph [ref=e572]: Oggetto
                      - paragraph [ref=e573]: Cassone scarrabile BTE CNTC06BIT
                    - generic [ref=e574]:
                      - paragraph [ref=e575]: Ingresso
                      - generic [ref=e577]:
                        - generic [ref=e578]: 24/08/2026
                        - generic [ref=e579]: 10 giorni
                  - generic [ref=e580]:
                    - generic [ref=e581]:
                      - paragraph [ref=e582]: Cliente
                      - paragraph [ref=e583]: Navita
                    - generic [ref=e584]:
                      - paragraph [ref=e585]: Cantiere
                      - paragraph [ref=e586]: Modugno
                  - generic [ref=e588]:
                    - paragraph [ref=e589]: Matricola
                    - paragraph [ref=e590]: 17C2165
                - group "Stato, priorità e addetto" [ref=e591]:
                  - generic [ref=e592]:
                    - generic: Stato
                    - button "Stato — Cassone scarrabile BTE CNTC06BIT" [ref=e596] [cursor=pointer]:
                      - generic [ref=e597]: Attesa Ricambi
                      - img [ref=e598]
                  - generic [ref=e600]:
                    - generic: Priorità
                    - button "Priorità — Cassone scarrabile BTE CNTC06BIT" [ref=e604] [cursor=pointer]:
                      - generic [ref=e605]: Media
                      - img [ref=e606]
                  - generic [ref=e608]:
                    - generic: Addetto
                    - button "Addetto — Cassone scarrabile BTE CNTC06BIT" [ref=e612] [cursor=pointer]:
                      - generic [ref=e613]: Vito Polieri
                      - img [ref=e614]
                - group "Ultimo aggiornamento e azioni" [ref=e616]:
                  - generic [ref=e618]:
                    - paragraph [ref=e619]:
                      - generic [ref=e620]: "Ultimo aggiornamento:"
                      - text: 26/08/2026 · 18:03
                    - paragraph [ref=e621]: Vito Namoini
                  - generic [ref=e622]:
                    - button "Concludi" [ref=e623] [cursor=pointer]:
                      - img [ref=e624]
                    - button "Informazioni" [ref=e626] [cursor=pointer]:
                      - img [ref=e627]
                    - button "Schede" [ref=e629] [cursor=pointer]:
                      - img [ref=e630]
                      - generic: 1/3
              - generic [ref=e632]:
                - generic [ref=e633]:
                  - generic [ref=e634]:
                    - generic [ref=e635]:
                      - paragraph [ref=e636]: Oggetto
                      - paragraph [ref=e637]: Spazzatrice Schmidt Cleango 400 ET
                    - generic [ref=e638]:
                      - paragraph [ref=e639]: Ingresso
                      - generic [ref=e641]:
                        - generic [ref=e642]: 25/08/2026
                        - generic [ref=e643]: 9 giorni
                  - generic [ref=e644]:
                    - generic [ref=e645]:
                      - paragraph [ref=e646]: Cliente
                      - paragraph [ref=e647]: AMIU Bari
                    - generic [ref=e648]:
                      - paragraph [ref=e649]: Cantiere
                      - paragraph [ref=e650]: Bari
                  - generic [ref=e652]:
                    - paragraph [ref=e653]: Scuderia
                    - paragraph [ref=e654]: "1581"
                - group "Stato, priorità e addetto" [ref=e655]:
                  - generic [ref=e656]:
                    - generic: Stato
                    - button "Stato — Spazzatrice Schmidt Cleango 400 ET" [ref=e660] [cursor=pointer]:
                      - generic [ref=e661]: Attesa Preventivo
                      - img [ref=e662]
                  - generic [ref=e664]:
                    - generic: Priorità
                    - button "Priorità — Spazzatrice Schmidt Cleango 400 ET" [ref=e668] [cursor=pointer]:
                      - generic [ref=e669]: Bassa
                      - img [ref=e670]
                  - generic [ref=e672]:
                    - generic: Addetto
                    - button "Addetto — Spazzatrice Schmidt Cleango 400 ET" [ref=e676] [cursor=pointer]:
                      - generic [ref=e677]: Donato Macina
                      - img [ref=e678]
                - group "Ultimo aggiornamento e azioni" [ref=e680]:
                  - generic [ref=e682]:
                    - paragraph [ref=e683]:
                      - generic [ref=e684]: "Ultimo aggiornamento:"
                      - text: 28/08/2026 · 12:14
                    - paragraph [ref=e685]: Vito Namoini
                  - generic [ref=e686]:
                    - button "Concludi" [ref=e687] [cursor=pointer]:
                      - img [ref=e688]
                    - button "Informazioni" [ref=e690] [cursor=pointer]:
                      - img [ref=e691]
                    - button "Schede" [ref=e693] [cursor=pointer]:
                      - img [ref=e694]
                      - generic: 1/3
              - generic [ref=e696]:
                - generic [ref=e697]:
                  - generic [ref=e698]:
                    - generic [ref=e699]:
                      - paragraph [ref=e700]: Oggetto
                      - paragraph [ref=e701]: Botti SO04FT010
                    - generic [ref=e702]:
                      - paragraph [ref=e703]: Ingresso
                      - generic [ref=e705]:
                        - generic [ref=e706]: 26/08/2026
                        - generic [ref=e707]: 8 giorni
                  - generic [ref=e708]:
                    - generic [ref=e709]:
                      - paragraph [ref=e710]: Cliente
                      - paragraph [ref=e711]: AMIU Bari
                    - generic [ref=e712]:
                      - paragraph [ref=e713]: Cantiere
                      - paragraph [ref=e714]: Bari
                  - generic [ref=e715]:
                    - generic [ref=e716]:
                      - paragraph [ref=e717]: Scuderia
                      - paragraph [ref=e718]: "1460"
                    - generic [ref=e719]:
                      - paragraph [ref=e720]: Targa
                      - paragraph [ref=e721]: GK259CK
                    - generic [ref=e722]:
                      - paragraph [ref=e723]: Matricola
                      - paragraph [ref=e724]: SMT0178
                - group "Stato, priorità e addetto" [ref=e725]:
                  - generic [ref=e726]:
                    - generic: Stato
                    - button "Stato — Botti SO04FT010" [ref=e730] [cursor=pointer]:
                      - generic [ref=e731]: Da Lavorare
                      - img [ref=e732]
                  - generic [ref=e734]:
                    - generic: Priorità
                    - button "Priorità — Botti SO04FT010" [ref=e738] [cursor=pointer]:
                      - generic [ref=e739]: Urgente
                      - img [ref=e740]
                  - generic [ref=e742]:
                    - generic: Addetto
                    - button "Addetto — Botti SO04FT010" [ref=e746] [cursor=pointer]:
                      - generic [ref=e747]: Angelo Morino
                      - img [ref=e748]
                - group "Ultimo aggiornamento e azioni" [ref=e750]:
                  - generic [ref=e752]:
                    - paragraph [ref=e753]:
                      - generic [ref=e754]: "Ultimo aggiornamento:"
                      - text: 01/09/2026 · 15:22
                    - paragraph [ref=e755]: Vito Namoini
                  - generic [ref=e756]:
                    - button "Concludi" [ref=e757] [cursor=pointer]:
                      - img [ref=e758]
                    - button "Informazioni" [ref=e760] [cursor=pointer]:
                      - img [ref=e761]
                    - button "Schede" [ref=e763] [cursor=pointer]:
                      - img [ref=e764]
                      - generic: 1/3
              - generic [ref=e766]:
                - generic [ref=e767]:
                  - generic [ref=e768]:
                    - generic [ref=e769]:
                      - paragraph [ref=e770]: Oggetto
                      - paragraph [ref=e771]: Compattatore scarrabile BTE CSM24B500D
                    - generic [ref=e772]:
                      - paragraph [ref=e773]: Ingresso
                      - generic [ref=e775]:
                        - generic [ref=e776]: 26/08/2026
                        - generic [ref=e777]: 8 giorni
                  - generic [ref=e778]:
                    - generic [ref=e779]:
                      - paragraph [ref=e780]: Cliente
                      - paragraph [ref=e781]: CE.RE.BA.
                    - generic [ref=e782]:
                      - paragraph [ref=e783]: Cantiere
                      - paragraph [ref=e784]: Rutigliano
                  - generic [ref=e786]:
                    - paragraph [ref=e787]: Scuderia
                    - paragraph [ref=e788]: "6"
                - group "Stato, priorità e addetto" [ref=e789]:
                  - generic [ref=e790]:
                    - generic: Stato
                    - button "Stato — Compattatore scarrabile BTE CSM24B500D" [ref=e794] [cursor=pointer]:
                      - generic [ref=e795]: Da Lavorare
                      - img [ref=e796]
                  - generic [ref=e798]:
                    - generic: Priorità
                    - button "Priorità — Compattatore scarrabile BTE CSM24B500D" [ref=e802] [cursor=pointer]:
                      - generic [ref=e803]: Media
                      - img [ref=e804]
                  - generic [ref=e806]:
                    - generic: Addetto
                    - button "Addetto — Compattatore scarrabile BTE CSM24B500D" [ref=e810] [cursor=pointer]:
                      - generic [ref=e811]: Donato Macina
                      - img [ref=e812]
                - group "Ultimo aggiornamento e azioni" [ref=e814]:
                  - generic [ref=e816]:
                    - paragraph [ref=e817]:
                      - generic [ref=e818]: "Ultimo aggiornamento:"
                      - text: 28/08/2026 · 13:20
                    - paragraph [ref=e819]: Vito Namoini
                  - generic [ref=e820]:
                    - button "Concludi" [ref=e821] [cursor=pointer]:
                      - img [ref=e822]
                    - button "Informazioni" [ref=e824] [cursor=pointer]:
                      - img [ref=e825]
                    - button "Schede" [ref=e827] [cursor=pointer]:
                      - img [ref=e828]
                      - generic: 1/3
              - generic [ref=e830]:
                - generic [ref=e831]:
                  - generic [ref=e832]:
                    - generic [ref=e833]:
                      - paragraph [ref=e834]: Oggetto
                      - paragraph [ref=e835]: Cilindro idraulico
                    - generic [ref=e836]:
                      - paragraph [ref=e837]: Ingresso
                      - generic [ref=e839]:
                        - generic [ref=e840]: 26/08/2026
                        - generic [ref=e841]: 8 giorni
                  - generic [ref=e842]:
                    - generic [ref=e843]:
                      - paragraph [ref=e844]: Cliente
                      - paragraph [ref=e845]: AVR per l'Ambiente
                    - generic [ref=e846]:
                      - paragraph [ref=e847]: Cantiere
                      - paragraph [ref=e848]: Acquaviva delle Fonti
                - group "Stato, priorità e addetto" [ref=e849]:
                  - generic [ref=e850]:
                    - generic: Stato
                    - button "Stato — Cilindro idraulico" [ref=e854] [cursor=pointer]:
                      - generic [ref=e855]: Attesa Preventivo
                      - img [ref=e856]
                  - generic [ref=e858]:
                    - generic: Priorità
                    - button "Priorità — Cilindro idraulico" [ref=e862] [cursor=pointer]:
                      - generic [ref=e863]: Media
                      - img [ref=e864]
                  - generic [ref=e866]:
                    - generic: Addetto
                    - button "Addetto — Cilindro idraulico" [ref=e870] [cursor=pointer]:
                      - generic [ref=e871]: Angelo Morino
                      - img [ref=e872]
                - group "Ultimo aggiornamento e azioni" [ref=e874]:
                  - generic [ref=e876]:
                    - paragraph [ref=e877]:
                      - generic [ref=e878]: "Ultimo aggiornamento:"
                      - text: 31/08/2026 · 16:33
                    - paragraph [ref=e879]: Vito Namoini
                  - generic [ref=e880]:
                    - button "Concludi" [ref=e881] [cursor=pointer]:
                      - img [ref=e882]
                    - button "Informazioni" [ref=e884] [cursor=pointer]:
                      - img [ref=e885]
                    - button "Schede" [ref=e887] [cursor=pointer]:
                      - img [ref=e888]
                      - generic: 1/3
              - generic [ref=e890]:
                - generic [ref=e891]:
                  - generic [ref=e892]:
                    - generic [ref=e893]:
                      - paragraph [ref=e894]: Oggetto
                      - paragraph [ref=e895]: Bivasca Novarini CT2
                    - generic [ref=e896]:
                      - paragraph [ref=e897]: Ingresso
                      - generic [ref=e899]:
                        - generic [ref=e900]: 27/08/2026
                        - generic [ref=e901]: 7 giorni
                  - generic [ref=e902]:
                    - generic [ref=e903]:
                      - paragraph [ref=e904]: Cliente
                      - paragraph [ref=e905]: MTA
                    - generic [ref=e906]:
                      - paragraph [ref=e907]: Cantiere
                      - paragraph [ref=e908]: Maglie
                  - generic [ref=e909]:
                    - generic [ref=e910]:
                      - paragraph [ref=e911]: Targa
                      - paragraph [ref=e912]: ZA865WA
                    - generic [ref=e913]:
                      - paragraph [ref=e914]: Matricola
                      - paragraph [ref=e915]: "03836"
                - group "Stato, priorità e addetto" [ref=e916]:
                  - generic [ref=e917]:
                    - generic: Stato
                    - button "Stato — Bivasca Novarini CT2" [ref=e921] [cursor=pointer]:
                      - generic [ref=e922]: Attesa Ricambi
                      - img [ref=e923]
                  - generic [ref=e925]:
                    - generic: Priorità
                    - button "Priorità — Bivasca Novarini CT2" [ref=e929] [cursor=pointer]:
                      - generic [ref=e930]: Media
                      - img [ref=e931]
                  - generic [ref=e933]:
                    - generic: Addetto
                    - button "Addetto — Bivasca Novarini CT2" [ref=e937] [cursor=pointer]:
                      - generic [ref=e938]: Mino Barbone
                      - img [ref=e939]
                - group "Ultimo aggiornamento e azioni" [ref=e941]:
                  - generic [ref=e943]:
                    - paragraph [ref=e944]:
                      - generic [ref=e945]: "Ultimo aggiornamento:"
                      - text: 31/08/2026 · 16:22
                    - paragraph [ref=e946]: Vito Namoini
                  - generic [ref=e947]:
                    - button "Concludi" [ref=e948] [cursor=pointer]:
                      - img [ref=e949]
                    - button "Informazioni" [ref=e951] [cursor=pointer]:
                      - img [ref=e952]
                    - button "Schede" [ref=e954] [cursor=pointer]:
                      - img [ref=e955]
                      - generic: 1/3
              - generic [ref=e957]:
                - generic [ref=e958]:
                  - generic [ref=e959]:
                    - generic [ref=e960]:
                      - paragraph [ref=e961]: Oggetto
                      - paragraph [ref=e962]: Compattatore Farid B0E T1
                    - generic [ref=e963]:
                      - paragraph [ref=e964]: Ingresso
                      - generic [ref=e966]:
                        - generic [ref=e967]: 27/08/2026
                        - generic [ref=e968]: 7 giorni
                  - generic [ref=e969]:
                    - generic [ref=e970]:
                      - paragraph [ref=e971]: Cliente
                      - paragraph [ref=e972]: Ecosveva
                    - generic [ref=e973]:
                      - paragraph [ref=e974]: Cantiere
                      - paragraph [ref=e975]: Andria
                  - generic [ref=e976]:
                    - generic [ref=e977]:
                      - paragraph [ref=e978]: Targa
                      - paragraph [ref=e979]: CR275NB
                    - generic [ref=e980]:
                      - paragraph [ref=e981]: Matricola
                      - paragraph [ref=e982]: "028"
                - group "Stato, priorità e addetto" [ref=e983]:
                  - generic [ref=e984]:
                    - generic: Stato
                    - button "Stato — Compattatore Farid B0E T1" [ref=e988] [cursor=pointer]:
                      - generic [ref=e989]: In Lavorazione
                      - img [ref=e990]
                  - generic [ref=e992]:
                    - generic: Priorità
                    - button "Priorità — Compattatore Farid B0E T1" [ref=e996] [cursor=pointer]:
                      - generic [ref=e997]: Media
                      - img [ref=e998]
                  - generic [ref=e1000]:
                    - generic: Addetto
                    - button "Addetto — Compattatore Farid B0E T1" [ref=e1004] [cursor=pointer]:
                      - generic [ref=e1005]: Angelo Morino
                      - img [ref=e1006]
                - group "Ultimo aggiornamento e azioni" [ref=e1008]:
                  - generic [ref=e1010]:
                    - paragraph [ref=e1011]:
                      - generic [ref=e1012]: "Ultimo aggiornamento:"
                      - text: 31/08/2026 · 16:22
                    - paragraph [ref=e1013]: Vito Namoini
                  - generic [ref=e1014]:
                    - button "Concludi" [ref=e1015] [cursor=pointer]:
                      - img [ref=e1016]
                    - button "Informazioni" [ref=e1018] [cursor=pointer]:
                      - img [ref=e1019]
                    - button "Schede" [ref=e1021] [cursor=pointer]:
                      - img [ref=e1022]
                      - generic: 1/3
              - generic [ref=e1024]:
                - generic [ref=e1025]:
                  - generic [ref=e1026]:
                    - generic [ref=e1027]:
                      - paragraph [ref=e1028]: Oggetto
                      - paragraph [ref=e1029]: Costipatore Coseco K1P
                    - generic [ref=e1030]:
                      - paragraph [ref=e1031]: Ingresso
                      - generic [ref=e1033]:
                        - generic [ref=e1034]: 28/08/2026
                        - generic [ref=e1035]: 6 giorni
                  - generic [ref=e1036]:
                    - generic [ref=e1037]:
                      - paragraph [ref=e1038]: Cliente
                      - paragraph [ref=e1039]: Bellizzi
                    - generic [ref=e1040]:
                      - paragraph [ref=e1041]: Utilizzatore
                      - paragraph [ref=e1042]: AMIU Trani
                    - generic [ref=e1043]:
                      - paragraph [ref=e1044]: Cantiere
                      - paragraph [ref=e1045]: Trani
                  - generic [ref=e1046]:
                    - generic [ref=e1047]:
                      - paragraph [ref=e1048]: Targa
                      - paragraph [ref=e1049]: FZ985XH
                    - generic [ref=e1050]:
                      - paragraph [ref=e1051]: Matricola
                      - paragraph [ref=e1052]: 203/20
                - group "Stato, priorità e addetto" [ref=e1053]:
                  - generic [ref=e1054]:
                    - generic: Stato
                    - button "Stato — Costipatore Coseco K1P" [ref=e1058] [cursor=pointer]:
                      - generic [ref=e1059]: Attesa Preventivo
                      - img [ref=e1060]
                  - generic [ref=e1062]:
                    - generic: Priorità
                    - button "Priorità — Costipatore Coseco K1P" [ref=e1066] [cursor=pointer]:
                      - generic [ref=e1067]: Media
                      - img [ref=e1068]
                  - generic [ref=e1070]:
                    - generic: Addetto
                    - button "Addetto — Costipatore Coseco K1P" [ref=e1074] [cursor=pointer]:
                      - generic [ref=e1075]: Mino Barbone
                      - img [ref=e1076]
                - group "Ultimo aggiornamento e azioni" [ref=e1078]:
                  - generic [ref=e1080]:
                    - paragraph [ref=e1081]:
                      - generic [ref=e1082]: "Ultimo aggiornamento:"
                      - text: 02/09/2026 · 16:11
                    - paragraph [ref=e1083]: Vito Namoini
                  - generic [ref=e1084]:
                    - button "Concludi" [ref=e1085] [cursor=pointer]:
                      - img [ref=e1086]
                    - button "Informazioni" [ref=e1088] [cursor=pointer]:
                      - img [ref=e1089]
                    - button "Schede" [ref=e1091] [cursor=pointer]:
                      - img [ref=e1092]
                      - generic: 1/3
              - generic [ref=e1094]:
                - generic [ref=e1095]:
                  - generic [ref=e1096]:
                    - generic [ref=e1097]:
                      - paragraph [ref=e1098]: Oggetto
                      - paragraph [ref=e1099]: Compattatore Farid T1H
                    - generic [ref=e1100]:
                      - paragraph [ref=e1101]: Ingresso
                      - generic [ref=e1103]:
                        - generic [ref=e1104]: 01/09/2026
                        - generic [ref=e1105]: 2 giorni
                  - generic [ref=e1106]:
                    - generic [ref=e1107]:
                      - paragraph [ref=e1108]: Cliente
                      - paragraph [ref=e1109]: AVR per l'Ambiente
                    - generic [ref=e1110]:
                      - paragraph [ref=e1111]: Cantiere
                      - paragraph [ref=e1112]: Capurso
                  - generic [ref=e1113]:
                    - generic [ref=e1114]:
                      - paragraph [ref=e1115]: Targa
                      - paragraph [ref=e1116]: FV909FA
                    - generic [ref=e1117]:
                      - paragraph [ref=e1118]: Matricola
                      - paragraph [ref=e1119]: 0065/01489
                - group "Stato, priorità e addetto" [ref=e1120]:
                  - generic [ref=e1121]:
                    - generic: Stato
                    - button "Stato — Compattatore Farid T1H" [ref=e1125] [cursor=pointer]:
                      - generic [ref=e1126]: In Lavorazione
                      - img [ref=e1127]
                  - generic [ref=e1129]:
                    - generic: Priorità
                    - button "Priorità — Compattatore Farid T1H" [ref=e1133] [cursor=pointer]:
                      - generic [ref=e1134]: Media
                      - img [ref=e1135]
                  - generic [ref=e1137]:
                    - generic: Addetto
                    - button "Addetto — Compattatore Farid T1H" [ref=e1141] [cursor=pointer]:
                      - generic [ref=e1142]: Angelo Morino
                      - img [ref=e1143]
                - group "Ultimo aggiornamento e azioni" [ref=e1145]:
                  - generic [ref=e1147]:
                    - paragraph [ref=e1148]:
                      - generic [ref=e1149]: "Ultimo aggiornamento:"
                      - text: 01/09/2026 · 13:25
                    - paragraph [ref=e1150]: Vito Namoini
                  - generic [ref=e1151]:
                    - button "Concludi" [ref=e1152] [cursor=pointer]:
                      - img [ref=e1153]
                    - button "Informazioni" [ref=e1155] [cursor=pointer]:
                      - img [ref=e1156]
                    - button "Schede" [ref=e1158] [cursor=pointer]:
                      - img [ref=e1159]
                      - generic: 1/3
              - generic [ref=e1161]:
                - generic [ref=e1162]:
                  - generic [ref=e1163]:
                    - generic [ref=e1164]:
                      - paragraph [ref=e1165]: Oggetto
                      - paragraph [ref=e1166]: Costipatore Tecno Industrie AZIMUT
                    - generic [ref=e1167]:
                      - paragraph [ref=e1168]: Ingresso
                      - generic [ref=e1170]:
                        - generic [ref=e1171]: 02/09/2026
                        - generic [ref=e1172]: 1 giorno
                  - generic [ref=e1173]:
                    - generic [ref=e1174]:
                      - paragraph [ref=e1175]: Cliente
                      - paragraph [ref=e1176]: AVR per l'Ambiente
                    - generic [ref=e1177]:
                      - paragraph [ref=e1178]: Cantiere
                      - paragraph [ref=e1179]: Capurso
                  - generic [ref=e1180]:
                    - generic [ref=e1181]:
                      - paragraph [ref=e1182]: Targa
                      - paragraph [ref=e1183]: ZA135ZD
                    - generic [ref=e1184]:
                      - paragraph [ref=e1185]: Matricola
                      - paragraph [ref=e1186]: TIS 213378/18
                - group "Stato, priorità e addetto" [ref=e1187]:
                  - generic [ref=e1188]:
                    - generic: Stato
                    - button "Stato — Costipatore Tecno Industrie AZIMUT" [ref=e1192] [cursor=pointer]:
                      - generic [ref=e1193]: Accettazione
                      - img [ref=e1194]
                  - generic [ref=e1196]:
                    - generic: Priorità
                    - button "Priorità — Costipatore Tecno Industrie AZIMUT" [ref=e1200] [cursor=pointer]:
                      - generic [ref=e1201]: Media
                      - img [ref=e1202]
                  - generic [ref=e1204]:
                    - generic: Addetto
                    - button "Addetto — Costipatore Tecno Industrie AZIMUT" [ref=e1208] [cursor=pointer]:
                      - generic [ref=e1209]: Angelo Morino
                      - img [ref=e1210]
                - group "Ultimo aggiornamento e azioni" [ref=e1212]:
                  - generic [ref=e1214]:
                    - paragraph [ref=e1215]:
                      - generic [ref=e1216]: "Ultimo aggiornamento:"
                      - text: 02/09/2026 · 17:00
                    - paragraph [ref=e1217]: Giorgio Namoini
                  - generic [ref=e1218]:
                    - button "Concludi" [ref=e1219] [cursor=pointer]:
                      - img [ref=e1220]
                    - button "Informazioni" [ref=e1222] [cursor=pointer]:
                      - img [ref=e1223]
                    - button "Schede" [ref=e1225] [cursor=pointer]:
                      - img [ref=e1226]
                      - generic: 1/3
              - generic [ref=e1228]:
                - generic [ref=e1229]:
                  - generic [ref=e1230]:
                    - generic [ref=e1231]:
                      - paragraph [ref=e1232]: Oggetto
                      - paragraph [ref=e1233]: Cassa con gru BTE CNTGRULS
                    - generic [ref=e1234]:
                      - paragraph [ref=e1235]: Ingresso
                      - generic [ref=e1237]:
                        - generic [ref=e1238]: 02/09/2026
                        - generic [ref=e1239]: 1 giorno
                  - generic [ref=e1240]:
                    - generic [ref=e1241]:
                      - paragraph [ref=e1242]: Cliente
                      - paragraph [ref=e1243]: MEC
                    - generic [ref=e1244]:
                      - paragraph [ref=e1245]: Utilizzatore
                      - paragraph [ref=e1246]: Recuperi Pugliesi
                    - generic [ref=e1247]:
                      - paragraph [ref=e1248]: Cantiere
                      - paragraph [ref=e1249]: Modugno
                  - generic [ref=e1251]:
                    - paragraph [ref=e1252]: Matricola
                    - paragraph [ref=e1253]: 25C2429/2025
                - group "Stato, priorità e addetto" [ref=e1254]:
                  - generic [ref=e1255]:
                    - generic: Stato
                    - button "Stato — Cassa con gru BTE CNTGRULS" [ref=e1259] [cursor=pointer]:
                      - generic [ref=e1260]: Accettazione
                      - img [ref=e1261]
                  - generic [ref=e1263]:
                    - generic: Priorità
                    - button "Priorità — Cassa con gru BTE CNTGRULS" [ref=e1267] [cursor=pointer]:
                      - generic [ref=e1268]: Media
                      - img [ref=e1269]
                  - generic [ref=e1271]:
                    - generic: Addetto
                    - button "Addetto — Cassa con gru BTE CNTGRULS" [ref=e1275] [cursor=pointer]:
                      - generic [ref=e1276]: Angelo Morino
                      - img [ref=e1277]
                - group "Ultimo aggiornamento e azioni" [ref=e1279]:
                  - generic [ref=e1281]:
                    - paragraph [ref=e1282]:
                      - generic [ref=e1283]: "Ultimo aggiornamento:"
                      - text: 02/09/2026 · 17:06
                    - paragraph [ref=e1284]: Giorgio Namoini
                  - generic [ref=e1285]:
                    - button "Concludi" [ref=e1286] [cursor=pointer]:
                      - img [ref=e1287]
                    - button "Informazioni" [ref=e1289] [cursor=pointer]:
                      - img [ref=e1290]
                    - button "Schede" [ref=e1292] [cursor=pointer]:
                      - img [ref=e1293]
                      - generic: 1/3
              - generic [ref=e1295]:
                - generic [ref=e1296]:
                  - generic [ref=e1297]:
                    - generic [ref=e1298]:
                      - paragraph [ref=e1299]: Oggetto
                      - paragraph [ref=e1300]: Compattatore scarrabile BTE CMP26APL40
                    - generic [ref=e1301]:
                      - paragraph [ref=e1302]: Ingresso
                      - generic [ref=e1304]:
                        - generic [ref=e1305]: 02/09/2026
                        - generic [ref=e1306]: 1 giorno
                  - generic [ref=e1307]:
                    - generic [ref=e1308]:
                      - paragraph [ref=e1309]: Cliente
                      - paragraph [ref=e1310]: B-Energy
                    - generic [ref=e1311]:
                      - paragraph [ref=e1312]: Cantiere
                      - paragraph [ref=e1313]: Foggia
                  - generic [ref=e1315]:
                    - paragraph [ref=e1316]: Matricola
                    - paragraph [ref=e1317]: 16P0277
                - group "Stato, priorità e addetto" [ref=e1318]:
                  - generic [ref=e1319]:
                    - generic: Stato
                    - button "Stato — Compattatore scarrabile BTE CMP26APL40" [ref=e1323] [cursor=pointer]:
                      - generic [ref=e1324]: Accettazione
                      - img [ref=e1325]
                  - generic [ref=e1327]:
                    - generic: Priorità
                    - button "Priorità — Compattatore scarrabile BTE CMP26APL40" [ref=e1331] [cursor=pointer]:
                      - generic [ref=e1332]: Media
                      - img [ref=e1333]
                  - generic [ref=e1335]:
                    - generic: Addetto
                    - button "Addetto — Compattatore scarrabile BTE CMP26APL40" [ref=e1339] [cursor=pointer]:
                      - generic [ref=e1340]: Angelo Morino
                      - img [ref=e1341]
                - group "Ultimo aggiornamento e azioni" [ref=e1343]:
                  - generic [ref=e1345]:
                    - paragraph [ref=e1346]:
                      - generic [ref=e1347]: "Ultimo aggiornamento:"
                      - text: 02/09/2026 · 17:03
                    - paragraph [ref=e1348]: Giorgio Namoini
                  - generic [ref=e1349]:
                    - button "Concludi" [ref=e1350] [cursor=pointer]:
                      - img [ref=e1351]
                    - button "Informazioni" [ref=e1353] [cursor=pointer]:
                      - img [ref=e1354]
                    - button "Schede" [ref=e1356] [cursor=pointer]:
                      - img [ref=e1357]
                      - generic: 1/3
        - button "Mostra Archivio lavorazioni (146)" [ref=e1361] [cursor=pointer]:
          - heading "Archivio lavorazioni (146)" [level=2] [ref=e1363]
          - img [ref=e1365]
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