# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> list surface /lavorazioni-clienti: cards cookie on mobile viewport
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
          - heading "Portale Clienti" [level=1]
      - generic [ref=e46]:
        - region "Azioni e filtri lavorazioni clienti" [ref=e49]:
          - generic [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e55]:
                - generic:
                  - img
                - searchbox "Cerca lavorazioni clienti" [ref=e56]
              - generic [ref=e57]:
                - button "Contattaci" [ref=e59] [cursor=pointer]:
                  - img [ref=e60]
                  - text: Contattaci
                - button "Filtri" [ref=e63] [cursor=pointer]:
                  - img [ref=e64]
            - generic [ref=e70]:
              - generic [ref=e71]: "165"
              - generic [ref=e72]: risultati
        - generic [ref=e73]:
          - button "Nascondi Lavorazioni in corso (19)" [expanded] [ref=e75] [cursor=pointer]:
            - heading "Lavorazioni in corso (19)" [level=2] [ref=e77]
            - img [ref=e79]
          - region "Lavorazioni in corso (19)" [ref=e81]:
            - region "Lavorazioni in corso" [ref=e84]:
              - generic [ref=e85]:
                - generic [ref=e86]:
                  - generic [ref=e87]:
                    - generic [ref=e88]:
                      - generic [ref=e89]:
                        - paragraph [ref=e90]: Oggetto
                        - paragraph [ref=e91]: BTE CNTGRULS
                      - generic [ref=e92]:
                        - paragraph [ref=e93]: Ingresso
                        - generic [ref=e95]: 02/09/2026
                    - generic [ref=e96]:
                      - generic [ref=e97]:
                        - paragraph [ref=e98]: Cliente
                        - paragraph [ref=e99]: MEC
                      - generic [ref=e100]:
                        - paragraph [ref=e101]: Utilizzatore
                        - paragraph [ref=e102]: Recuperi Pugliesi
                      - generic [ref=e103]:
                        - paragraph [ref=e104]: Cantiere
                        - paragraph [ref=e105]: Modugno
                    - generic [ref=e107]:
                      - paragraph [ref=e108]: Matricola
                      - paragraph [ref=e109]: 25C2429/2025
                  - group "Stato e addetto" [ref=e110]:
                    - generic [ref=e111]:
                      - generic: Stato
                      - generic [ref=e114]: Accettazione
                    - generic [ref=e115]:
                      - generic: Addetto
                      - generic [ref=e118]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e119]:
                    - generic [ref=e121]:
                      - button "Scheda ingresso" [ref=e122] [cursor=pointer]:
                        - img [ref=e123]
                      - button "QR lavorazione" [ref=e126] [cursor=pointer]:
                        - img [ref=e127]
                      - link "Informazioni e avanzamento" [ref=e129] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/68326046-e221-4334-a012-12049a2b0a80
                        - img [ref=e130]
                - generic [ref=e132]:
                  - generic [ref=e133]:
                    - generic [ref=e134]:
                      - generic [ref=e135]:
                        - paragraph [ref=e136]: Oggetto
                        - paragraph [ref=e137]: BTE CMP26APL40
                      - generic [ref=e138]:
                        - paragraph [ref=e139]: Ingresso
                        - generic [ref=e141]: 02/09/2026
                    - generic [ref=e142]:
                      - generic [ref=e143]:
                        - paragraph [ref=e144]: Cliente
                        - paragraph [ref=e145]: B-Energy
                      - generic [ref=e146]:
                        - paragraph [ref=e147]: Cantiere
                        - paragraph [ref=e148]: Foggia
                    - generic [ref=e150]:
                      - paragraph [ref=e151]: Matricola
                      - paragraph [ref=e152]: 16P0277
                  - group "Stato e addetto" [ref=e153]:
                    - generic [ref=e154]:
                      - generic: Stato
                      - generic [ref=e157]: Accettazione
                    - generic [ref=e158]:
                      - generic: Addetto
                      - generic [ref=e161]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e164]:
                    - generic [ref=e166]:
                      - button "Scheda ingresso" [ref=e167] [cursor=pointer]:
                        - img [ref=e168]
                      - button "QR lavorazione" [ref=e171] [cursor=pointer]:
                        - img [ref=e172]
                      - link "Informazioni e avanzamento" [ref=e174] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/a3376a62-d344-4f20-a7f9-5a046c7f3f99
                        - img [ref=e175]
                - generic [ref=e177]:
                  - generic [ref=e178]:
                    - generic [ref=e179]:
                      - generic [ref=e180]:
                        - paragraph [ref=e181]: Oggetto
                        - paragraph [ref=e182]: Tecno Industrie AZIMUT
                      - generic [ref=e183]:
                        - paragraph [ref=e184]: Ingresso
                        - generic [ref=e186]: 02/09/2026
                    - generic [ref=e187]:
                      - generic [ref=e188]:
                        - paragraph [ref=e189]: Cliente
                        - paragraph [ref=e190]: AVR per l'Ambiente
                      - generic [ref=e191]:
                        - paragraph [ref=e192]: Cantiere
                        - paragraph [ref=e193]: Capurso
                    - generic [ref=e194]:
                      - generic [ref=e195]:
                        - paragraph [ref=e196]: Targa
                        - paragraph [ref=e197]: ZA135ZD
                      - generic [ref=e198]:
                        - paragraph [ref=e199]: Matricola
                        - paragraph [ref=e200]: TIS 213378/18
                  - group "Stato e addetto" [ref=e201]:
                    - generic [ref=e202]:
                      - generic: Stato
                      - generic [ref=e205]: Accettazione
                    - generic [ref=e206]:
                      - generic: Addetto
                      - generic [ref=e209]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e212]:
                    - generic [ref=e214]:
                      - button "Scheda ingresso" [ref=e215] [cursor=pointer]:
                        - img [ref=e216]
                      - button "QR lavorazione" [ref=e219] [cursor=pointer]:
                        - img [ref=e220]
                      - link "Informazioni e avanzamento" [ref=e222] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/10ebe220-975b-4278-8537-4fdf3b8f5592
                        - img [ref=e223]
                - generic [ref=e225]:
                  - generic [ref=e226]:
                    - generic [ref=e227]:
                      - generic [ref=e228]:
                        - paragraph [ref=e229]: Oggetto
                        - paragraph [ref=e230]: Farid T1H
                      - generic [ref=e231]:
                        - paragraph [ref=e232]: Ingresso
                        - generic [ref=e234]: 01/09/2026
                    - generic [ref=e235]:
                      - generic [ref=e236]:
                        - paragraph [ref=e237]: Cliente
                        - paragraph [ref=e238]: AVR per l'Ambiente
                      - generic [ref=e239]:
                        - paragraph [ref=e240]: Cantiere
                        - paragraph [ref=e241]: Capurso
                    - generic [ref=e242]:
                      - generic [ref=e243]:
                        - paragraph [ref=e244]: Targa
                        - paragraph [ref=e245]: FV909FA
                      - generic [ref=e246]:
                        - paragraph [ref=e247]: Matricola
                        - paragraph [ref=e248]: 0065/01489
                  - group "Stato e addetto" [ref=e249]:
                    - generic [ref=e250]:
                      - generic: Stato
                      - generic [ref=e253]: In Lavorazione
                    - generic [ref=e254]:
                      - generic: Addetto
                      - generic [ref=e257]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e260]:
                    - generic [ref=e262]:
                      - button "Scheda ingresso" [ref=e263] [cursor=pointer]:
                        - img [ref=e264]
                      - button "QR lavorazione" [ref=e267] [cursor=pointer]:
                        - img [ref=e268]
                      - link "Informazioni e avanzamento" [ref=e270] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/17d6429a-e456-4193-9b57-10c2b26f828b
                        - img [ref=e271]
                - generic [ref=e273]:
                  - generic [ref=e274]:
                    - generic [ref=e275]:
                      - generic [ref=e276]:
                        - paragraph [ref=e277]: Oggetto
                        - paragraph [ref=e278]: Coseco K1P
                      - generic [ref=e279]:
                        - paragraph [ref=e280]: Ingresso
                        - generic [ref=e282]: 28/08/2026
                    - generic [ref=e283]:
                      - generic [ref=e284]:
                        - paragraph [ref=e285]: Cliente
                        - paragraph [ref=e286]: Bellizzi
                      - generic [ref=e287]:
                        - paragraph [ref=e288]: Utilizzatore
                        - paragraph [ref=e289]: AMIU Trani
                      - generic [ref=e290]:
                        - paragraph [ref=e291]: Cantiere
                        - paragraph [ref=e292]: Trani
                    - generic [ref=e293]:
                      - generic [ref=e294]:
                        - paragraph [ref=e295]: Targa
                        - paragraph [ref=e296]: FZ985XH
                      - generic [ref=e297]:
                        - paragraph [ref=e298]: Matricola
                        - paragraph [ref=e299]: 203/20
                  - group "Stato e addetto" [ref=e300]:
                    - generic [ref=e301]:
                      - generic: Stato
                      - generic [ref=e304]: Attesa Preventivo
                    - generic [ref=e305]:
                      - generic: Addetto
                      - generic [ref=e308]: Mino Barbone
                  - group "Ultimo aggiornamento e azioni" [ref=e311]:
                    - generic [ref=e313]:
                      - button "Scheda ingresso" [ref=e314] [cursor=pointer]:
                        - img [ref=e315]
                      - button "QR lavorazione" [ref=e318] [cursor=pointer]:
                        - img [ref=e319]
                      - link "Informazioni e avanzamento" [ref=e321] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/12d0cff2-b68c-4a43-95d1-26f822211ad4
                        - img [ref=e322]
                - generic [ref=e324]:
                  - generic [ref=e325]:
                    - generic [ref=e326]:
                      - generic [ref=e327]:
                        - paragraph [ref=e328]: Oggetto
                        - paragraph [ref=e329]: Novarini CT2
                      - generic [ref=e330]:
                        - paragraph [ref=e331]: Ingresso
                        - generic [ref=e333]: 27/08/2026
                    - generic [ref=e334]:
                      - generic [ref=e335]:
                        - paragraph [ref=e336]: Cliente
                        - paragraph [ref=e337]: MTA
                      - generic [ref=e338]:
                        - paragraph [ref=e339]: Cantiere
                        - paragraph [ref=e340]: Maglie
                    - generic [ref=e341]:
                      - generic [ref=e342]:
                        - paragraph [ref=e343]: Targa
                        - paragraph [ref=e344]: ZA865WA
                      - generic [ref=e345]:
                        - paragraph [ref=e346]: Matricola
                        - paragraph [ref=e347]: "03836"
                  - group "Stato e addetto" [ref=e348]:
                    - generic [ref=e349]:
                      - generic: Stato
                      - generic [ref=e352]: Attesa Ricambi
                    - generic [ref=e353]:
                      - generic: Addetto
                      - generic [ref=e356]: Mino Barbone
                  - group "Ultimo aggiornamento e azioni" [ref=e359]:
                    - generic [ref=e361]:
                      - button "Scheda ingresso" [ref=e362] [cursor=pointer]:
                        - img [ref=e363]
                      - button "QR lavorazione" [ref=e366] [cursor=pointer]:
                        - img [ref=e367]
                      - link "Informazioni e avanzamento" [ref=e369] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/3dad36cf-263d-4491-9855-753535bb90c0
                        - img [ref=e370]
                - generic [ref=e372]:
                  - generic [ref=e373]:
                    - generic [ref=e374]:
                      - generic [ref=e375]:
                        - paragraph [ref=e376]: Oggetto
                        - paragraph [ref=e377]: Farid B0E T1
                      - generic [ref=e378]:
                        - paragraph [ref=e379]: Ingresso
                        - generic [ref=e381]: 27/08/2026
                    - generic [ref=e382]:
                      - generic [ref=e383]:
                        - paragraph [ref=e384]: Cliente
                        - paragraph [ref=e385]: Ecosveva
                      - generic [ref=e386]:
                        - paragraph [ref=e387]: Cantiere
                        - paragraph [ref=e388]: Andria
                    - generic [ref=e389]:
                      - generic [ref=e390]:
                        - paragraph [ref=e391]: Targa
                        - paragraph [ref=e392]: CR275NB
                      - generic [ref=e393]:
                        - paragraph [ref=e394]: Matricola
                        - paragraph [ref=e395]: "028"
                  - group "Stato e addetto" [ref=e396]:
                    - generic [ref=e397]:
                      - generic: Stato
                      - generic [ref=e400]: In Lavorazione
                    - generic [ref=e401]:
                      - generic: Addetto
                      - generic [ref=e404]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e407]:
                    - generic [ref=e409]:
                      - button "Scheda ingresso" [ref=e410] [cursor=pointer]:
                        - img [ref=e411]
                      - button "QR lavorazione" [ref=e414] [cursor=pointer]:
                        - img [ref=e415]
                      - link "Informazioni e avanzamento" [ref=e417] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/feefe539-8dc9-465b-8eab-fd5e3490d1a0
                        - img [ref=e418]
                - generic [ref=e420]:
                  - generic [ref=e421]:
                    - generic [ref=e422]:
                      - generic [ref=e423]:
                        - paragraph [ref=e424]: Oggetto
                        - paragraph [ref=e425]: BTE CSM24B500D
                      - generic [ref=e426]:
                        - paragraph [ref=e427]: Ingresso
                        - generic [ref=e429]: 26/08/2026
                    - generic [ref=e430]:
                      - generic [ref=e431]:
                        - paragraph [ref=e432]: Cliente
                        - paragraph [ref=e433]: CE.RE.BA.
                      - generic [ref=e434]:
                        - paragraph [ref=e435]: Cantiere
                        - paragraph [ref=e436]: Rutigliano
                    - generic [ref=e438]:
                      - paragraph [ref=e439]: Scuderia
                      - paragraph [ref=e440]: "6"
                  - group "Stato e addetto" [ref=e441]:
                    - generic [ref=e442]:
                      - generic: Stato
                      - generic [ref=e445]: Da Lavorare
                    - generic [ref=e446]:
                      - generic: Addetto
                      - generic [ref=e449]: Donato Macina
                  - group "Ultimo aggiornamento e azioni" [ref=e452]:
                    - generic [ref=e454]:
                      - button "Scheda ingresso" [ref=e455] [cursor=pointer]:
                        - img [ref=e456]
                      - button "QR lavorazione" [ref=e459] [cursor=pointer]:
                        - img [ref=e460]
                      - link "Informazioni e avanzamento" [ref=e462] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/b41544f2-0907-4213-9e61-1e7015ba442c
                        - img [ref=e463]
                - generic [ref=e465]:
                  - generic [ref=e466]:
                    - generic [ref=e467]:
                      - generic [ref=e468]:
                        - paragraph [ref=e469]: Oggetto
                        - paragraph [ref=e470]: Botti SO04FT010
                      - generic [ref=e471]:
                        - paragraph [ref=e472]: Ingresso
                        - generic [ref=e474]: 26/08/2026
                    - generic [ref=e475]:
                      - generic [ref=e476]:
                        - paragraph [ref=e477]: Cliente
                        - paragraph [ref=e478]: AMIU Bari
                      - generic [ref=e479]:
                        - paragraph [ref=e480]: Cantiere
                        - paragraph [ref=e481]: Bari
                    - generic [ref=e482]:
                      - generic [ref=e483]:
                        - paragraph [ref=e484]: Scuderia
                        - paragraph [ref=e485]: "1460"
                      - generic [ref=e486]:
                        - paragraph [ref=e487]: Targa
                        - paragraph [ref=e488]: GK259CK
                      - generic [ref=e489]:
                        - paragraph [ref=e490]: Matricola
                        - paragraph [ref=e491]: SMT0178
                  - group "Stato e addetto" [ref=e492]:
                    - generic [ref=e493]:
                      - generic: Stato
                      - generic [ref=e496]: Da Lavorare
                    - generic [ref=e497]:
                      - generic: Addetto
                      - generic [ref=e500]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e503]:
                    - generic [ref=e505]:
                      - button "Scheda ingresso" [ref=e506] [cursor=pointer]:
                        - img [ref=e507]
                      - button "QR lavorazione" [ref=e510] [cursor=pointer]:
                        - img [ref=e511]
                      - link "Informazioni e avanzamento" [ref=e513] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/45ad8dda-005b-4451-8c56-6537d25c0645
                        - img [ref=e514]
                - generic [ref=e516]:
                  - generic [ref=e517]:
                    - generic [ref=e518]:
                      - generic [ref=e519]:
                        - paragraph [ref=e520]: Oggetto
                        - paragraph [ref=e521]: Cilindro idraulico
                      - generic [ref=e522]:
                        - paragraph [ref=e523]: Ingresso
                        - generic [ref=e525]: 26/08/2026
                    - generic [ref=e526]:
                      - generic [ref=e527]:
                        - paragraph [ref=e528]: Cliente
                        - paragraph [ref=e529]: AVR per l'Ambiente
                      - generic [ref=e530]:
                        - paragraph [ref=e531]: Cantiere
                        - paragraph [ref=e532]: Acquaviva delle Fonti
                  - group "Stato e addetto" [ref=e533]:
                    - generic [ref=e534]:
                      - generic: Stato
                      - generic [ref=e537]: Attesa Preventivo
                    - generic [ref=e538]:
                      - generic: Addetto
                      - generic [ref=e541]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e544]:
                    - generic [ref=e546]:
                      - button "Scheda ingresso" [ref=e547] [cursor=pointer]:
                        - img [ref=e548]
                      - button "QR lavorazione" [ref=e551] [cursor=pointer]:
                        - img [ref=e552]
                      - link "Informazioni e avanzamento" [ref=e554] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/c9fe499b-3ae3-45b1-8937-0749bba1bbb5
                        - img [ref=e555]
                - generic [ref=e557]:
                  - generic [ref=e558]:
                    - generic [ref=e559]:
                      - generic [ref=e560]:
                        - paragraph [ref=e561]: Oggetto
                        - paragraph [ref=e562]: Schmidt Cleango 400 ET
                      - generic [ref=e563]:
                        - paragraph [ref=e564]: Ingresso
                        - generic [ref=e566]: 25/08/2026
                    - generic [ref=e567]:
                      - generic [ref=e568]:
                        - paragraph [ref=e569]: Cliente
                        - paragraph [ref=e570]: AMIU Bari
                      - generic [ref=e571]:
                        - paragraph [ref=e572]: Cantiere
                        - paragraph [ref=e573]: Bari
                    - generic [ref=e575]:
                      - paragraph [ref=e576]: Scuderia
                      - paragraph [ref=e577]: "1581"
                  - group "Stato e addetto" [ref=e578]:
                    - generic [ref=e579]:
                      - generic: Stato
                      - generic [ref=e582]: Attesa Preventivo
                    - generic [ref=e583]:
                      - generic: Addetto
                      - generic [ref=e586]: Donato Macina
                  - group "Ultimo aggiornamento e azioni" [ref=e589]:
                    - generic [ref=e591]:
                      - button "Scheda ingresso" [ref=e592] [cursor=pointer]:
                        - img [ref=e593]
                      - button "QR lavorazione" [ref=e596] [cursor=pointer]:
                        - img [ref=e597]
                      - link "Informazioni e avanzamento" [ref=e599] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/d7215dbe-57e2-46cb-a37c-31dbeadf91d9
                        - img [ref=e600]
                - generic [ref=e602]:
                  - generic [ref=e603]:
                    - generic [ref=e604]:
                      - generic [ref=e605]:
                        - paragraph [ref=e606]: Oggetto
                        - paragraph [ref=e607]: Doppstadt
                      - generic [ref=e608]:
                        - paragraph [ref=e609]: Ingresso
                        - generic [ref=e611]: 24/08/2026
                    - generic [ref=e612]:
                      - generic [ref=e613]:
                        - paragraph [ref=e614]: Cliente
                        - paragraph [ref=e615]: AVR per l'Ambiente
                      - generic [ref=e616]:
                        - paragraph [ref=e617]: Cantiere
                        - paragraph [ref=e618]: Acquaviva delle Fonti
                  - group "Stato e addetto" [ref=e619]:
                    - generic [ref=e620]:
                      - generic: Stato
                      - generic [ref=e623]: Attesa Preventivo
                    - generic [ref=e624]:
                      - generic: Addetto
                      - generic [ref=e627]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e630]:
                    - generic [ref=e632]:
                      - button "Scheda ingresso" [ref=e633] [cursor=pointer]:
                        - img [ref=e634]
                      - button "QR lavorazione" [ref=e637] [cursor=pointer]:
                        - img [ref=e638]
                      - link "Informazioni e avanzamento" [ref=e640] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/a8ebc9b4-2b99-4997-89cd-b486a6aef80e
                        - img [ref=e641]
                - generic [ref=e643]:
                  - generic [ref=e644]:
                    - generic [ref=e645]:
                      - generic [ref=e646]:
                        - paragraph [ref=e647]: Oggetto
                        - paragraph [ref=e648]: BTE CNTC06BIT
                      - generic [ref=e649]:
                        - paragraph [ref=e650]: Ingresso
                        - generic [ref=e652]: 24/08/2026
                    - generic [ref=e653]:
                      - generic [ref=e654]:
                        - paragraph [ref=e655]: Cliente
                        - paragraph [ref=e656]: Navita
                      - generic [ref=e657]:
                        - paragraph [ref=e658]: Cantiere
                        - paragraph [ref=e659]: Modugno
                    - generic [ref=e661]:
                      - paragraph [ref=e662]: Matricola
                      - paragraph [ref=e663]: 17C2165
                  - group "Stato e addetto" [ref=e664]:
                    - generic [ref=e665]:
                      - generic: Stato
                      - generic [ref=e668]: Attesa Ricambi
                    - generic [ref=e669]:
                      - generic: Addetto
                      - generic [ref=e672]: Vito Polieri
                  - group "Ultimo aggiornamento e azioni" [ref=e675]:
                    - generic [ref=e677]:
                      - button "Scheda ingresso" [ref=e678] [cursor=pointer]:
                        - img [ref=e679]
                      - button "QR lavorazione" [ref=e682] [cursor=pointer]:
                        - img [ref=e683]
                      - link "Informazioni e avanzamento" [ref=e685] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/f137b89c-303f-440b-8426-8e7970e0aee9
                        - img [ref=e686]
                - generic [ref=e688]:
                  - generic [ref=e689]:
                    - generic [ref=e690]:
                      - generic [ref=e691]:
                        - paragraph [ref=e692]: Oggetto
                        - paragraph [ref=e693]: Longo
                      - generic [ref=e694]:
                        - paragraph [ref=e695]: Ingresso
                        - generic [ref=e697]: 03/08/2026
                    - generic [ref=e698]:
                      - generic [ref=e699]:
                        - paragraph [ref=e700]: Cliente
                        - paragraph [ref=e701]: AMIU Bari
                      - generic [ref=e702]:
                        - paragraph [ref=e703]: Cantiere
                        - paragraph [ref=e704]: Bari
                    - generic [ref=e705]:
                      - generic [ref=e706]:
                        - paragraph [ref=e707]: Scuderia
                        - paragraph [ref=e708]: "1279"
                      - generic [ref=e709]:
                        - paragraph [ref=e710]: Targa
                        - paragraph [ref=e711]: FK012MM
                      - generic [ref=e712]:
                        - paragraph [ref=e713]: Matricola
                        - paragraph [ref=e714]: 165/340
                  - group "Stato e addetto" [ref=e715]:
                    - generic [ref=e716]:
                      - generic: Stato
                      - generic [ref=e719]: In Lavorazione
                    - generic [ref=e720]:
                      - generic: Addetto
                      - generic [ref=e723]: Donato Macina
                  - group "Ultimo aggiornamento e azioni" [ref=e726]:
                    - generic [ref=e728]:
                      - button "Scheda ingresso" [ref=e729] [cursor=pointer]:
                        - img [ref=e730]
                      - button "QR lavorazione" [ref=e733] [cursor=pointer]:
                        - img [ref=e734]
                      - link "Informazioni e avanzamento" [ref=e736] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/abfe8ef9-cd43-4607-b985-68f75224e923
                        - img [ref=e737]
                - generic [ref=e739]:
                  - generic [ref=e740]:
                    - generic [ref=e741]:
                      - generic [ref=e742]:
                        - paragraph [ref=e743]: Oggetto
                        - paragraph [ref=e744]: BTE CSM24B500D
                      - generic [ref=e745]:
                        - paragraph [ref=e746]: Ingresso
                        - generic [ref=e748]: 29/07/2026
                    - generic [ref=e749]:
                      - generic [ref=e750]:
                        - paragraph [ref=e751]: Cliente
                        - paragraph [ref=e752]: Bianco Igiene Ambientale
                      - generic [ref=e753]:
                        - paragraph [ref=e754]: Cantiere
                        - paragraph [ref=e755]: Ostuni
                    - generic [ref=e757]:
                      - paragraph [ref=e758]: Matricola
                      - paragraph [ref=e759]: 19P0656
                  - group "Stato e addetto" [ref=e760]:
                    - generic [ref=e761]:
                      - generic: Stato
                      - generic [ref=e764]: Accettazione
                    - generic [ref=e765]:
                      - generic: Addetto
                      - generic [ref=e768]: Mino Barbone
                  - group "Ultimo aggiornamento e azioni" [ref=e771]:
                    - generic [ref=e773]:
                      - button "Scheda ingresso" [ref=e774] [cursor=pointer]:
                        - img [ref=e775]
                      - button "QR lavorazione" [ref=e778] [cursor=pointer]:
                        - img [ref=e779]
                      - link "Informazioni e avanzamento" [ref=e781] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/5ee3df77-013a-476b-afe5-2df70c08a94e
                        - img [ref=e782]
                - generic [ref=e784]:
                  - generic [ref=e785]:
                    - generic [ref=e786]:
                      - generic [ref=e787]:
                        - paragraph [ref=e788]: Oggetto
                        - paragraph [ref=e789]: Sicas NA4m3
                      - generic [ref=e790]:
                        - paragraph [ref=e791]: Ingresso
                        - generic [ref=e793]: 24/07/2026
                    - generic [ref=e794]:
                      - generic [ref=e795]:
                        - paragraph [ref=e796]: Cliente
                        - paragraph [ref=e797]: Teknoservice
                      - generic [ref=e798]:
                        - paragraph [ref=e799]: Cantiere
                        - paragraph [ref=e800]: Altamura - Ba
                    - generic [ref=e801]:
                      - generic [ref=e802]:
                        - paragraph [ref=e803]: Scuderia
                        - paragraph [ref=e804]: 4C0233
                      - generic [ref=e805]:
                        - paragraph [ref=e806]: Targa
                        - paragraph [ref=e807]: AHS601
                  - group "Stato e addetto" [ref=e808]:
                    - generic [ref=e809]:
                      - generic: Stato
                      - generic [ref=e812]: Attesa Ricambi
                    - generic [ref=e813]:
                      - generic: Addetto
                      - generic [ref=e816]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e819]:
                    - generic [ref=e821]:
                      - button "Scheda ingresso" [ref=e822] [cursor=pointer]:
                        - img [ref=e823]
                      - button "QR lavorazione" [ref=e826] [cursor=pointer]:
                        - img [ref=e827]
                      - link "Informazioni e avanzamento" [ref=e829] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/c41d3281-32a4-417a-9e35-3e73b22f5797
                        - img [ref=e830]
                - generic [ref=e832]:
                  - generic [ref=e833]:
                    - generic [ref=e834]:
                      - generic [ref=e835]:
                        - paragraph [ref=e836]: Oggetto
                        - paragraph [ref=e837]: MEC CL.120.83.1Z1
                      - generic [ref=e838]:
                        - paragraph [ref=e839]: Ingresso
                        - generic [ref=e841]: 22/05/2026
                    - generic [ref=e842]:
                      - generic [ref=e843]:
                        - paragraph [ref=e844]: Cliente
                        - paragraph [ref=e845]: EcoAmbiente Sud
                      - generic [ref=e846]:
                        - paragraph [ref=e847]: Cantiere
                        - paragraph [ref=e848]: Fasano
                    - generic [ref=e850]:
                      - paragraph [ref=e851]: Matricola
                      - paragraph [ref=e852]: "70188038"
                  - group "Stato e addetto" [ref=e853]:
                    - generic [ref=e854]:
                      - generic: Stato
                      - generic [ref=e857]: Attesa Ricambi
                    - generic [ref=e858]:
                      - generic: Addetto
                      - generic [ref=e861]: Angelo Morino
                  - group "Ultimo aggiornamento e azioni" [ref=e864]:
                    - generic [ref=e866]:
                      - button "Scheda ingresso" [ref=e867] [cursor=pointer]:
                        - img [ref=e868]
                      - button "QR lavorazione" [ref=e871] [cursor=pointer]:
                        - img [ref=e872]
                      - link "Informazioni e avanzamento" [ref=e874] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/1a012a4d-91cd-4fbb-9813-7a1cf5968e88
                        - img [ref=e875]
                - generic [ref=e877]:
                  - generic [ref=e878]:
                    - generic [ref=e879]:
                      - generic [ref=e880]:
                        - paragraph [ref=e881]: Oggetto
                        - paragraph [ref=e882]: Schmidt AS750
                      - generic [ref=e883]:
                        - paragraph [ref=e884]: Ingresso
                        - generic [ref=e886]: 07/05/2026
                    - generic [ref=e887]:
                      - generic [ref=e888]:
                        - paragraph [ref=e889]: Cliente
                        - paragraph [ref=e890]: A.M.
                      - generic [ref=e891]:
                        - paragraph [ref=e892]: Cantiere
                        - paragraph [ref=e893]: Mungivacca
                    - generic [ref=e895]:
                      - paragraph [ref=e896]: Matricola
                      - paragraph [ref=e897]: AMBN203
                  - group "Stato e addetto" [ref=e898]:
                    - generic [ref=e899]:
                      - generic: Stato
                      - generic [ref=e902]: Accettazione
                    - generic [ref=e903]:
                      - generic: Addetto
                      - generic [ref=e906]: Mino Barbone
                  - group "Ultimo aggiornamento e azioni" [ref=e909]:
                    - generic [ref=e911]:
                      - button "Scheda ingresso" [ref=e912] [cursor=pointer]:
                        - img [ref=e913]
                      - button "QR lavorazione" [ref=e916] [cursor=pointer]:
                        - img [ref=e917]
                      - link "Informazioni e avanzamento" [ref=e919] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/ccb48d52-adda-4570-b710-0997a972f0c1
                        - img [ref=e920]
                - generic [ref=e922]:
                  - generic [ref=e923]:
                    - generic [ref=e924]:
                      - generic [ref=e925]:
                        - paragraph [ref=e926]: Oggetto
                        - paragraph [ref=e927]: Nextra K-MD24T
                      - generic [ref=e928]:
                        - paragraph [ref=e929]: Ingresso
                        - generic [ref=e931]: 05/03/2026
                    - generic [ref=e932]:
                      - generic [ref=e933]:
                        - paragraph [ref=e934]: Cliente
                        - paragraph [ref=e935]: Recuperi Pugliesi
                      - generic [ref=e936]:
                        - paragraph [ref=e937]: Cantiere
                        - paragraph [ref=e938]: Modugno
                    - generic [ref=e939]:
                      - generic [ref=e940]:
                        - paragraph [ref=e941]: Targa
                        - paragraph [ref=e942]: ET897CD
                      - generic [ref=e943]:
                        - paragraph [ref=e944]: Matricola
                        - paragraph [ref=e945]: 386/213
                  - group "Stato e addetto" [ref=e946]:
                    - generic [ref=e947]:
                      - generic: Stato
                      - generic [ref=e950]: Attesa Ricambi
                    - generic [ref=e951]:
                      - generic: Addetto
                      - generic [ref=e954]: Vito Polieri
                  - group "Ultimo aggiornamento e azioni" [ref=e957]:
                    - generic [ref=e959]:
                      - button "Scheda ingresso" [ref=e960] [cursor=pointer]:
                        - img [ref=e961]
                      - button "QR lavorazione" [ref=e964] [cursor=pointer]:
                        - img [ref=e965]
                      - link "Informazioni e avanzamento" [ref=e967] [cursor=pointer]:
                        - /url: /lavorazioni-clienti/e2782185-c973-4a66-8e95-e19b28f08922
                        - img [ref=e968]
        - generic [ref=e970]:
          - button "Mostra Lavorazioni completate (146)" [ref=e972] [cursor=pointer]:
            - heading "Lavorazioni completate (146)" [level=2] [ref=e974]
            - img [ref=e976]
          - region [ref=e979]:
            - paragraph [ref=e980]: Nessuna lavorazione in archivio.
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