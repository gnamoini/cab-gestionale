# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-list-layout-views.spec.ts >> list surface /mezzi: cards cookie on mobile viewport
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
  - main [ref=e15]:
    - generic [ref=e18]:
      - generic [ref=e21]:
        - button "Apri menu" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - generic [ref=e26]:
          - heading "Mezzi" [level=1]
        - button "Azioni pagina" [ref=e29] [cursor=pointer]:
          - img [ref=e30]
          - generic [ref=e34]: Azioni pagina
      - generic [ref=e35]:
        - button [ref=e37] [cursor=pointer]: Importa
        - generic [ref=e38]:
          - group "Vista pagina mezzi" [ref=e40]:
            - button "Anagrafica" [pressed] [ref=e41] [cursor=pointer]
            - button "Tagliandi" [ref=e42] [cursor=pointer]
          - generic [ref=e44]:
            - generic [ref=e46]:
              - generic [ref=e47]:
                - generic [ref=e50]:
                  - generic:
                    - img
                  - searchbox "Cerca mezzi" [ref=e51]
                - generic [ref=e52]:
                  - button "Nuovo" [ref=e54] [cursor=pointer]:
                    - generic [ref=e55]:
                      - img [ref=e56]
                      - generic [ref=e58]: Nuovo
                  - button "Filtri" [ref=e60] [cursor=pointer]:
                    - img [ref=e61]
              - generic [ref=e65]:
                - generic [ref=e68]:
                  - generic [ref=e69]: "132"
                  - generic [ref=e70]: risultati
                - switch "Etichette" [ref=e71] [cursor=pointer]:
                  - generic [ref=e72]: Etichette
            - generic [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e79]:
                  - generic [ref=e80]:
                    - generic [ref=e81]:
                      - paragraph [ref=e82]: Tecno Industrie Zenit 25
                      - paragraph [ref=e83]: SI.ECO
                    - generic [ref=e84]:
                      - paragraph [ref=e85]: N. lav.
                      - generic [ref=e86]: "1"
                  - paragraph [ref=e87]: EZ959WV · TIMP28535/14
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - term [ref=e90]: Cantiere
                    - definition [ref=e91]: Sannicandro di Bari
                  - generic [ref=e92]:
                    - term [ref=e93]: Telaio
                    - definition [ref=e94]:
                      - text: Iveco
                      - generic [ref=e95]: Stralis
                  - generic [ref=e96]:
                    - term [ref=e97]: Ultima lavorazione
                    - definition [ref=e98]: 30 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e99]:
                  - paragraph [ref=e102]:
                    - generic [ref=e103]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e104]:
                    - button "Dettaglio" [ref=e105] [cursor=pointer]:
                      - img [ref=e106]
                    - button "Tagliandi" [ref=e108] [cursor=pointer]:
                      - img [ref=e109]
                    - link "Documenti" [ref=e112] [cursor=pointer]:
                      - /url: /documenti?marca=Tecno+Industrie&modello=Zenit+25
                      - img [ref=e113]
                    - link "Lavorazioni" [ref=e115] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=02f7ad80-bd1b-4dbb-a988-6cdadcfc8e12
                      - img [ref=e116]
                    - link "Preventivi" [ref=e118] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=02f7ad80-bd1b-4dbb-a988-6cdadcfc8e12
                      - img [ref=e119]
                    - button "Stampa etichetta QR" [ref=e122] [cursor=pointer]:
                      - img [ref=e123]
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]:
                    - generic [ref=e128]:
                      - paragraph [ref=e129]: Nord Engineering Easy-J2
                      - paragraph [ref=e130]: Specchia
                      - paragraph [ref=e131]: AMIU Bari
                    - generic [ref=e132]:
                      - paragraph [ref=e133]: N. lav.
                      - generic [ref=e134]: "1"
                  - paragraph [ref=e135]: GZ923GX · S NE296 · Scud. 1653
                - generic [ref=e136]:
                  - generic [ref=e137]:
                    - term [ref=e138]: Cantiere
                    - definition [ref=e139]: Bari
                  - generic [ref=e140]:
                    - term [ref=e141]: Telaio
                    - definition [ref=e142]:
                      - text: Iveco
                      - generic [ref=e143]: Magirus
                  - generic [ref=e144]:
                    - term [ref=e145]: Ultima lavorazione
                    - definition [ref=e146]: 22 mag 2026
                - group "Ultimo aggiornamento e azioni" [ref=e147]:
                  - paragraph [ref=e150]:
                    - generic [ref=e151]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e152]:
                    - button "Dettaglio" [ref=e153] [cursor=pointer]:
                      - img [ref=e154]
                    - button "Tagliandi" [ref=e156] [cursor=pointer]:
                      - img [ref=e157]
                    - link "Documenti" [ref=e160] [cursor=pointer]:
                      - /url: /documenti?marca=Nord+Engineering&modello=Easy-J2
                      - img [ref=e161]
                    - link "Lavorazioni" [ref=e163] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=041c9ab4-3b6e-44f4-b946-c15473a1ef35
                      - img [ref=e164]
                    - link "Preventivi" [ref=e166] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=041c9ab4-3b6e-44f4-b946-c15473a1ef35
                      - img [ref=e167]
                    - button "Stampa etichetta QR" [ref=e170] [cursor=pointer]:
                      - img [ref=e171]
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - generic [ref=e175]:
                    - generic [ref=e176]:
                      - paragraph [ref=e177]: Botti SO04FT010
                      - paragraph [ref=e178]: AMIU Bari
                    - generic [ref=e179]:
                      - paragraph [ref=e180]: N. lav.
                      - generic [ref=e181]: "1"
                  - paragraph [ref=e182]: GK259CK · SMT0178 · Scud. 1460
                - generic [ref=e183]:
                  - generic [ref=e184]:
                    - term [ref=e185]: Cantiere
                    - definition [ref=e186]: Bari
                  - generic [ref=e187]:
                    - term [ref=e188]: Telaio
                    - definition [ref=e189]:
                      - text: Iveco
                      - generic [ref=e190]: Eurocargo
                  - generic [ref=e191]:
                    - term [ref=e192]: Ultima lavorazione
                    - definition [ref=e193]: 26 ago 2026
                - group "Ultimo aggiornamento e azioni" [ref=e194]:
                  - paragraph [ref=e197]:
                    - generic [ref=e198]: "Ultima modifica:"
                    - text: 26/08/26
                  - generic [ref=e199]:
                    - button "Dettaglio" [ref=e200] [cursor=pointer]:
                      - img [ref=e201]
                    - button "Tagliandi" [ref=e203] [cursor=pointer]:
                      - img [ref=e204]
                    - link "Documenti" [ref=e207] [cursor=pointer]:
                      - /url: /documenti?marca=Botti&modello=SO04FT010
                      - img [ref=e208]
                    - link "Lavorazioni" [ref=e210] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=064f684e-49a6-49bc-a7ea-e807e62c0c25
                      - img [ref=e211]
                    - link "Preventivi" [ref=e213] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=064f684e-49a6-49bc-a7ea-e807e62c0c25
                      - img [ref=e214]
                    - button "Stampa etichetta QR" [ref=e217] [cursor=pointer]:
                      - img [ref=e218]
              - generic [ref=e220]:
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - generic [ref=e223]:
                      - paragraph [ref=e224]: Coseco K5
                      - paragraph [ref=e225]: AMIU Bari
                    - generic [ref=e226]:
                      - paragraph [ref=e227]: N. lav.
                      - generic [ref=e228]: "1"
                  - paragraph [ref=e229]: DR946RL · 308/08 · Scud. 971
                - generic [ref=e230]:
                  - generic [ref=e231]:
                    - term [ref=e232]: Cantiere
                    - definition [ref=e233]: Bari
                  - generic [ref=e234]:
                    - term [ref=e235]: Telaio
                    - definition [ref=e236]:
                      - text: Eurocargo
                      - generic [ref=e237]: ISOE22
                  - generic [ref=e238]:
                    - term [ref=e239]: Ultima lavorazione
                    - definition [ref=e240]: 26 mag 2026
                - group "Ultimo aggiornamento e azioni" [ref=e241]:
                  - paragraph [ref=e244]:
                    - generic [ref=e245]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e246]:
                    - button "Dettaglio" [ref=e247] [cursor=pointer]:
                      - img [ref=e248]
                    - button "Tagliandi" [ref=e250] [cursor=pointer]:
                      - img [ref=e251]
                    - link "Documenti" [ref=e254] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K5
                      - img [ref=e255]
                    - link "Lavorazioni" [ref=e257] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=066df972-c91a-4c54-abe3-a2c0cedbd016
                      - img [ref=e258]
                    - link "Preventivi" [ref=e260] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=066df972-c91a-4c54-abe3-a2c0cedbd016
                      - img [ref=e261]
                    - button "Stampa etichetta QR" [ref=e264] [cursor=pointer]:
                      - img [ref=e265]
              - generic [ref=e267]:
                - generic [ref=e268]:
                  - generic [ref=e269]:
                    - generic [ref=e270]:
                      - paragraph [ref=e271]: Coseco K1R-K1V
                      - paragraph [ref=e272]: Bellizzi SpA
                      - paragraph [ref=e273]: AMIU Trani SpA
                    - generic [ref=e274]:
                      - paragraph [ref=e275]: N. lav.
                      - generic [ref=e276]: "1"
                  - paragraph [ref=e277]: GB702MT · 006/20
                - generic [ref=e278]:
                  - generic [ref=e279]:
                    - term [ref=e280]: Cantiere
                    - definition [ref=e281]: Trani
                  - generic [ref=e282]:
                    - term [ref=e283]: Telaio
                    - definition [ref=e284]:
                      - text: Isuzu
                      - generic [ref=e285]: P75
                  - generic [ref=e286]:
                    - term [ref=e287]: Ultima lavorazione
                    - definition [ref=e288]: 10 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e289]:
                  - paragraph [ref=e292]:
                    - generic [ref=e293]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e294]:
                    - button "Dettaglio" [ref=e295] [cursor=pointer]:
                      - img [ref=e296]
                    - button "Tagliandi" [ref=e298] [cursor=pointer]:
                      - img [ref=e299]
                    - link "Documenti" [ref=e302] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K1R-K1V
                      - img [ref=e303]
                    - link "Lavorazioni" [ref=e305] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=0835233b-c262-4ee1-857f-3720af24ca62
                      - img [ref=e306]
                    - link "Preventivi" [ref=e308] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=0835233b-c262-4ee1-857f-3720af24ca62
                      - img [ref=e309]
                    - button "Stampa etichetta QR" [ref=e312] [cursor=pointer]:
                      - img [ref=e313]
              - generic [ref=e315]:
                - generic [ref=e316]:
                  - generic [ref=e317]:
                    - generic [ref=e318]:
                      - paragraph [ref=e319]: Ziliani ZBT15
                      - paragraph [ref=e320]: Ecodaunia
                    - generic [ref=e321]:
                      - paragraph [ref=e322]: N. lav.
                      - generic [ref=e323]: "2"
                  - paragraph [ref=e324]: XA103TW · ZC23C0002
                - generic [ref=e325]:
                  - generic [ref=e326]:
                    - term [ref=e327]: Cantiere
                    - definition [ref=e328]: Cerignola
                  - generic [ref=e329]:
                    - term [ref=e330]: Telaio
                    - definition [ref=e331]: —
                  - generic [ref=e332]:
                    - term [ref=e333]: Ultima lavorazione
                    - definition [ref=e334]: 10 giu 2026
                - group "Ultimo aggiornamento e azioni" [ref=e335]:
                  - paragraph [ref=e338]:
                    - generic [ref=e339]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e340]:
                    - button "Dettaglio" [ref=e341] [cursor=pointer]:
                      - img [ref=e342]
                    - button "Tagliandi" [ref=e344] [cursor=pointer]:
                      - img [ref=e345]
                    - link "Documenti" [ref=e348] [cursor=pointer]:
                      - /url: /documenti?marca=Ziliani&modello=ZBT15
                      - img [ref=e349]
                    - link "Lavorazioni" [ref=e351] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=0a2699fb-0b14-4d03-bab7-6f816296681a
                      - img [ref=e352]
                    - link "Preventivi" [ref=e354] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=0a2699fb-0b14-4d03-bab7-6f816296681a
                      - img [ref=e355]
                    - button "Stampa etichetta QR" [ref=e358] [cursor=pointer]:
                      - img [ref=e359]
              - generic [ref=e361]:
                - generic [ref=e362]:
                  - generic [ref=e363]:
                    - generic [ref=e364]:
                      - paragraph [ref=e365]: Coseco K1R-K1V
                      - paragraph [ref=e366]: Bellizzi SpA
                      - paragraph [ref=e367]: AMIU Trani SpA
                    - generic [ref=e368]:
                      - paragraph [ref=e369]: N. lav.
                      - generic [ref=e370]: "1"
                  - paragraph [ref=e371]: GB794MT · 008/20
                - generic [ref=e372]:
                  - generic [ref=e373]:
                    - term [ref=e374]: Cantiere
                    - definition [ref=e375]: Trani
                  - generic [ref=e376]:
                    - term [ref=e377]: Telaio
                    - definition [ref=e378]:
                      - text: Isuzu
                      - generic [ref=e379]: P70
                  - generic [ref=e380]:
                    - term [ref=e381]: Ultima lavorazione
                    - definition [ref=e382]: 20 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e383]:
                  - paragraph [ref=e386]:
                    - generic [ref=e387]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e388]:
                    - button "Dettaglio" [ref=e389] [cursor=pointer]:
                      - img [ref=e390]
                    - button "Tagliandi" [ref=e392] [cursor=pointer]:
                      - img [ref=e393]
                    - link "Documenti" [ref=e396] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K1R-K1V
                      - img [ref=e397]
                    - link "Lavorazioni" [ref=e399] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=0b0f1b37-f5cc-483c-b50c-089f5d8e1394
                      - img [ref=e400]
                    - link "Preventivi" [ref=e402] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=0b0f1b37-f5cc-483c-b50c-089f5d8e1394
                      - img [ref=e403]
                    - button "Stampa etichetta QR" [ref=e406] [cursor=pointer]:
                      - img [ref=e407]
              - generic [ref=e409]:
                - generic [ref=e410]:
                  - generic [ref=e411]:
                    - generic [ref=e412]:
                      - paragraph [ref=e413]: Schmidt CityJet 6000
                      - paragraph [ref=e414]: AMIU Bari
                    - generic [ref=e415]:
                      - paragraph [ref=e416]: N. lav.
                      - generic [ref=e417]: "1"
                  - paragraph [ref=e418]: AMD872 · 61D05073 · Scud. 1437
                - generic [ref=e419]:
                  - generic [ref=e420]:
                    - term [ref=e421]: Cantiere
                    - definition [ref=e422]: Bari
                  - generic [ref=e423]:
                    - term [ref=e424]: Telaio
                    - definition [ref=e425]: —
                  - generic [ref=e426]:
                    - term [ref=e427]: Ultima lavorazione
                    - definition [ref=e428]: 04 giu 2026
                - group "Ultimo aggiornamento e azioni" [ref=e429]:
                  - paragraph [ref=e432]:
                    - generic [ref=e433]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e434]:
                    - button "Dettaglio" [ref=e435] [cursor=pointer]:
                      - img [ref=e436]
                    - button "Tagliandi" [ref=e438] [cursor=pointer]:
                      - img [ref=e439]
                    - link "Documenti" [ref=e442] [cursor=pointer]:
                      - /url: /documenti?marca=Schmidt&modello=CityJet+6000
                      - img [ref=e443]
                    - link "Lavorazioni" [ref=e445] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1086ffc5-a99a-4302-8687-d7a7678aaf78
                      - img [ref=e446]
                    - link "Preventivi" [ref=e448] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1086ffc5-a99a-4302-8687-d7a7678aaf78
                      - img [ref=e449]
                    - button "Stampa etichetta QR" [ref=e452] [cursor=pointer]:
                      - img [ref=e453]
              - generic [ref=e455]:
                - generic [ref=e456]:
                  - generic [ref=e457]:
                    - generic [ref=e458]:
                      - paragraph [ref=e459]: Guimatrag
                      - paragraph [ref=e460]: AMIU Bari
                    - generic [ref=e461]:
                      - paragraph [ref=e462]: N. lav.
                      - generic [ref=e463]: "1"
                  - paragraph [ref=e464]: "003"
                - generic [ref=e465]:
                  - generic [ref=e466]:
                    - term [ref=e467]: Cantiere
                    - definition [ref=e468]: Bari
                  - generic [ref=e469]:
                    - term [ref=e470]: Telaio
                    - definition [ref=e471]: —
                  - generic [ref=e472]:
                    - term [ref=e473]: Ultima lavorazione
                    - definition [ref=e474]: 28 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e475]:
                  - paragraph [ref=e478]:
                    - generic [ref=e479]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e480]:
                    - button "Dettaglio" [ref=e481] [cursor=pointer]:
                      - img [ref=e482]
                    - button "Tagliandi" [ref=e484] [cursor=pointer]:
                      - img [ref=e485]
                    - link "Documenti" [ref=e488] [cursor=pointer]:
                      - /url: /documenti?marca=Guimatrag&modello=%E2%80%94
                      - img [ref=e489]
                    - link "Lavorazioni" [ref=e491] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=11f108c9-4d6e-453c-9c22-85e1c2d1d00e
                      - img [ref=e492]
                    - link "Preventivi" [ref=e494] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=11f108c9-4d6e-453c-9c22-85e1c2d1d00e
                      - img [ref=e495]
                    - button "Stampa etichetta QR" [ref=e498] [cursor=pointer]:
                      - img [ref=e499]
              - generic [ref=e501]:
                - generic [ref=e502]:
                  - generic [ref=e503]:
                    - generic [ref=e504]:
                      - paragraph [ref=e505]: Coseco K3
                      - paragraph [ref=e506]: SI.ECO
                    - generic [ref=e507]:
                      - paragraph [ref=e508]: N. lav.
                      - generic [ref=e509]: "1"
                  - paragraph [ref=e510]: FC775AT · 040/15
                - generic [ref=e511]:
                  - generic [ref=e512]:
                    - term [ref=e513]: Cantiere
                    - definition [ref=e514]: Sannicandro di Bari
                  - generic [ref=e515]:
                    - term [ref=e516]: Telaio
                    - definition [ref=e517]:
                      - text: Iveco
                      - generic [ref=e518]: 120EL22
                  - generic [ref=e519]:
                    - term [ref=e520]: Ultima lavorazione
                    - definition [ref=e521]: 15 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e522]:
                  - paragraph [ref=e525]:
                    - generic [ref=e526]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e527]:
                    - button "Dettaglio" [ref=e528] [cursor=pointer]:
                      - img [ref=e529]
                    - button "Tagliandi" [ref=e531] [cursor=pointer]:
                      - img [ref=e532]
                    - link "Documenti" [ref=e535] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K3
                      - img [ref=e536]
                    - link "Lavorazioni" [ref=e538] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=156263e4-11a5-407c-be98-6b3f97eeff97
                      - img [ref=e539]
                    - link "Preventivi" [ref=e541] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=156263e4-11a5-407c-be98-6b3f97eeff97
                      - img [ref=e542]
                    - button "Stampa etichetta QR" [ref=e545] [cursor=pointer]:
                      - img [ref=e546]
              - generic [ref=e548]:
                - generic [ref=e549]:
                  - generic [ref=e550]:
                    - generic [ref=e551]:
                      - paragraph [ref=e552]: Ravo 540
                      - paragraph [ref=e553]: SI.ECO
                    - generic [ref=e554]:
                      - paragraph [ref=e555]: N. lav.
                      - generic [ref=e556]: "2"
                  - paragraph [ref=e557]: AJW681 · FA020294
                - generic [ref=e558]:
                  - generic [ref=e559]:
                    - term [ref=e560]: Cantiere
                    - definition [ref=e561]: Bitritto
                  - generic [ref=e562]:
                    - term [ref=e563]: Telaio
                    - definition [ref=e564]: —
                  - generic [ref=e565]:
                    - term [ref=e566]: Ultima lavorazione
                    - definition [ref=e567]: 03 ago 2026
                - group "Ultimo aggiornamento e azioni" [ref=e568]:
                  - paragraph [ref=e571]:
                    - generic [ref=e572]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e573]:
                    - button "Dettaglio" [ref=e574] [cursor=pointer]:
                      - img [ref=e575]
                    - button "Tagliandi" [ref=e577] [cursor=pointer]:
                      - img [ref=e578]
                    - link "Documenti" [ref=e581] [cursor=pointer]:
                      - /url: /documenti?marca=Ravo&modello=540
                      - img [ref=e582]
                    - link "Lavorazioni" [ref=e584] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=156f08fb-84ca-408c-bdb4-48dbef795f2a
                      - img [ref=e585]
                    - link "Preventivi" [ref=e587] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=156f08fb-84ca-408c-bdb4-48dbef795f2a
                      - img [ref=e588]
                    - button "Stampa etichetta QR" [ref=e591] [cursor=pointer]:
                      - img [ref=e592]
              - generic [ref=e594]:
                - generic [ref=e595]:
                  - generic [ref=e596]:
                    - generic [ref=e597]:
                      - paragraph [ref=e598]: G.M.F.
                      - paragraph [ref=e599]: Si.Eco
                    - generic [ref=e600]:
                      - paragraph [ref=e601]: N. lav.
                      - generic [ref=e602]: "1"
                  - paragraph [ref=e603]: DM688PC · 0451
                - generic [ref=e604]:
                  - generic [ref=e605]:
                    - term [ref=e606]: Cantiere
                    - definition [ref=e607]: Bitritto
                  - generic [ref=e608]:
                    - term [ref=e609]: Telaio
                    - definition [ref=e610]:
                      - text: Mercedes
                      - generic [ref=e611]: Axor
                  - generic [ref=e612]:
                    - term [ref=e613]: Ultima lavorazione
                    - definition [ref=e614]: 31 ago 2026
                - group "Ultimo aggiornamento e azioni" [ref=e615]:
                  - paragraph [ref=e618]:
                    - generic [ref=e619]: "Ultima modifica:"
                    - text: 31/08/26
                  - generic [ref=e620]:
                    - button "Dettaglio" [ref=e621] [cursor=pointer]:
                      - img [ref=e622]
                    - button "Tagliandi" [ref=e624] [cursor=pointer]:
                      - img [ref=e625]
                    - link "Documenti" [ref=e628] [cursor=pointer]:
                      - /url: /documenti?marca=G.M.F.&modello=%E2%80%94
                      - img [ref=e629]
                    - link "Lavorazioni" [ref=e631] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=16622739-5fde-49a3-be77-2f009f661793
                      - img [ref=e632]
                    - link "Preventivi" [ref=e634] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=16622739-5fde-49a3-be77-2f009f661793
                      - img [ref=e635]
                    - button "Stampa etichetta QR" [ref=e638] [cursor=pointer]:
                      - img [ref=e639]
              - generic [ref=e641]:
                - generic [ref=e642]:
                  - generic [ref=e643]:
                    - generic [ref=e644]:
                      - paragraph [ref=e645]: Coseco
                      - paragraph [ref=e646]: AMIU Bari
                    - generic [ref=e647]:
                      - paragraph [ref=e648]: N. lav.
                      - generic [ref=e649]: "1"
                  - paragraph [ref=e650]: Non assegnata · Scud. 1586
                - generic [ref=e651]:
                  - generic [ref=e652]:
                    - term [ref=e653]: Cantiere
                    - definition [ref=e654]: Bari
                  - generic [ref=e655]:
                    - term [ref=e656]: Telaio
                    - definition [ref=e657]: —
                  - generic [ref=e658]:
                    - term [ref=e659]: Ultima lavorazione
                    - definition [ref=e660]: 10 apr 2026
                - group "Ultimo aggiornamento e azioni" [ref=e661]:
                  - paragraph [ref=e664]:
                    - generic [ref=e665]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e666]:
                    - button "Dettaglio" [ref=e667] [cursor=pointer]:
                      - img [ref=e668]
                    - button "Tagliandi" [ref=e670] [cursor=pointer]:
                      - img [ref=e671]
                    - link "Documenti" [ref=e674] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=%E2%80%94
                      - img [ref=e675]
                    - link "Lavorazioni" [ref=e677] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=17339c65-24a9-48f5-b71b-c589c0bddcd3
                      - img [ref=e678]
                    - link "Preventivi" [ref=e680] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=17339c65-24a9-48f5-b71b-c589c0bddcd3
                      - img [ref=e681]
                    - button "Stampa etichetta QR" [ref=e684] [cursor=pointer]:
                      - img [ref=e685]
              - generic [ref=e687]:
                - generic [ref=e688]:
                  - generic [ref=e689]:
                    - generic [ref=e690]:
                      - paragraph [ref=e691]: Bucher CityCat 5000
                      - paragraph [ref=e692]: SI.ECO
                    - generic [ref=e693]:
                      - paragraph [ref=e694]: N. lav.
                      - generic [ref=e695]: "2"
                  - paragraph [ref=e696]: AJM062 · 104615
                - generic [ref=e697]:
                  - generic [ref=e698]:
                    - term [ref=e699]: Cantiere
                    - definition [ref=e700]: Adelfia
                  - generic [ref=e701]:
                    - term [ref=e702]: Telaio
                    - definition [ref=e703]: —
                  - generic [ref=e704]:
                    - term [ref=e705]: Ultima lavorazione
                    - definition [ref=e706]: 18 giu 2026
                - group "Ultimo aggiornamento e azioni" [ref=e707]:
                  - paragraph [ref=e710]:
                    - generic [ref=e711]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e712]:
                    - button "Dettaglio" [ref=e713] [cursor=pointer]:
                      - img [ref=e714]
                    - button "Tagliandi" [ref=e716] [cursor=pointer]:
                      - img [ref=e717]
                    - link "Documenti" [ref=e720] [cursor=pointer]:
                      - /url: /documenti?marca=Bucher&modello=CityCat+5000
                      - img [ref=e721]
                    - link "Lavorazioni" [ref=e723] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=17a837e3-6293-441f-9dd2-3a95b42a8852
                      - img [ref=e724]
                    - link "Preventivi" [ref=e726] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=17a837e3-6293-441f-9dd2-3a95b42a8852
                      - img [ref=e727]
                    - button "Stampa etichetta QR" [ref=e730] [cursor=pointer]:
                      - img [ref=e731]
              - generic [ref=e733]:
                - generic [ref=e734]:
                  - generic [ref=e735]:
                    - generic [ref=e736]:
                      - paragraph [ref=e737]: Tecno Industrie Zenit 25
                      - paragraph [ref=e738]: RaccolGo
                    - generic [ref=e739]:
                      - paragraph [ref=e740]: N. lav.
                      - generic [ref=e741]: "1"
                  - paragraph [ref=e742]: HZ747FM · 24C0486
                - generic [ref=e743]:
                  - generic [ref=e744]:
                    - term [ref=e745]: Cantiere
                    - definition [ref=e746]: Modugno
                  - generic [ref=e747]:
                    - term [ref=e748]: Telaio
                    - definition [ref=e749]:
                      - text: Volvo
                      - generic [ref=e750]: 350 FE
                  - generic [ref=e751]:
                    - term [ref=e752]: Ultima lavorazione
                    - definition [ref=e753]: 07 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e754]:
                  - paragraph [ref=e757]:
                    - generic [ref=e758]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e759]:
                    - button "Dettaglio" [ref=e760] [cursor=pointer]:
                      - img [ref=e761]
                    - button "Tagliandi" [ref=e763] [cursor=pointer]:
                      - img [ref=e764]
                    - link "Documenti" [ref=e767] [cursor=pointer]:
                      - /url: /documenti?marca=Tecno+Industrie&modello=Zenit+25
                      - img [ref=e768]
                    - link "Lavorazioni" [ref=e770] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=17f8b7cf-5efb-4a70-8a96-2d5a11fab524
                      - img [ref=e771]
                    - link "Preventivi" [ref=e773] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=17f8b7cf-5efb-4a70-8a96-2d5a11fab524
                      - img [ref=e774]
                    - button "Stampa etichetta QR" [ref=e777] [cursor=pointer]:
                      - img [ref=e778]
              - generic [ref=e780]:
                - generic [ref=e781]:
                  - generic [ref=e782]:
                    - generic [ref=e783]:
                      - paragraph [ref=e784]: OMB T-Rex
                      - paragraph [ref=e785]: Omnitech
                    - generic [ref=e786]:
                      - paragraph [ref=e787]: N. lav.
                      - generic [ref=e788]: "1"
                  - paragraph [ref=e789]: GK559KM · MV000929
                - generic [ref=e790]:
                  - generic [ref=e791]:
                    - term [ref=e792]: Cantiere
                    - definition [ref=e793]: Modugno
                  - generic [ref=e794]:
                    - term [ref=e795]: Telaio
                    - definition [ref=e796]:
                      - text: Mitsubishi
                      - generic [ref=e797]: Fuso Canter
                  - generic [ref=e798]:
                    - term [ref=e799]: Ultima lavorazione
                    - definition [ref=e800]: 01 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e801]:
                  - paragraph [ref=e804]:
                    - generic [ref=e805]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e806]:
                    - button "Dettaglio" [ref=e807] [cursor=pointer]:
                      - img [ref=e808]
                    - button "Tagliandi" [ref=e810] [cursor=pointer]:
                      - img [ref=e811]
                    - link "Documenti" [ref=e814] [cursor=pointer]:
                      - /url: /documenti?marca=OMB&modello=T-Rex
                      - img [ref=e815]
                    - link "Lavorazioni" [ref=e817] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1b3326d4-e0d6-4b37-9a97-ab1ff7d89e45
                      - img [ref=e818]
                    - link "Preventivi" [ref=e820] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1b3326d4-e0d6-4b37-9a97-ab1ff7d89e45
                      - img [ref=e821]
                    - button "Stampa etichetta QR" [ref=e824] [cursor=pointer]:
                      - img [ref=e825]
              - generic [ref=e827]:
                - generic [ref=e828]:
                  - generic [ref=e829]:
                    - generic [ref=e830]:
                      - paragraph [ref=e831]: Coseco K1P
                      - paragraph [ref=e832]: Bellizzi SpA
                      - paragraph [ref=e833]: AMIU Trani SpA
                    - generic [ref=e834]:
                      - paragraph [ref=e835]: N. lav.
                      - generic [ref=e836]: "1"
                  - paragraph [ref=e837]: GB069MT · 211/20
                - generic [ref=e838]:
                  - generic [ref=e839]:
                    - term [ref=e840]: Cantiere
                    - definition [ref=e841]: Trani
                  - generic [ref=e842]:
                    - term [ref=e843]: Telaio
                    - definition [ref=e844]:
                      - text: Mitsubishi
                      - generic [ref=e845]: Fuso Canter
                  - generic [ref=e846]:
                    - term [ref=e847]: Ultima lavorazione
                    - definition [ref=e848]: 09 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e849]:
                  - paragraph [ref=e852]:
                    - generic [ref=e853]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e854]:
                    - button "Dettaglio" [ref=e855] [cursor=pointer]:
                      - img [ref=e856]
                    - button "Tagliandi" [ref=e858] [cursor=pointer]:
                      - img [ref=e859]
                    - link "Documenti" [ref=e862] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K1P
                      - img [ref=e863]
                    - link "Lavorazioni" [ref=e865] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1b5b0d83-7dab-4c87-9b8f-a000e5f9e541
                      - img [ref=e866]
                    - link "Preventivi" [ref=e868] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1b5b0d83-7dab-4c87-9b8f-a000e5f9e541
                      - img [ref=e869]
                    - button "Stampa etichetta QR" [ref=e872] [cursor=pointer]:
                      - img [ref=e873]
              - generic [ref=e875]:
                - generic [ref=e876]:
                  - generic [ref=e877]:
                    - generic [ref=e878]:
                      - paragraph [ref=e879]: Sistemi SCA
                      - paragraph [ref=e880]: SI.ECO
                    - generic [ref=e881]:
                      - paragraph [ref=e882]: N. lav.
                      - generic [ref=e883]: "1"
                  - paragraph [ref=e884]: "1186"
                - generic [ref=e885]:
                  - generic [ref=e886]:
                    - term [ref=e887]: Cantiere
                    - definition [ref=e888]: Bitritto
                  - generic [ref=e889]:
                    - term [ref=e890]: Telaio
                    - definition [ref=e891]: —
                  - generic [ref=e892]:
                    - term [ref=e893]: Ultima lavorazione
                    - definition [ref=e894]: 28 mag 2026
                - group "Ultimo aggiornamento e azioni" [ref=e895]:
                  - paragraph [ref=e898]:
                    - generic [ref=e899]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e900]:
                    - button "Dettaglio" [ref=e901] [cursor=pointer]:
                      - img [ref=e902]
                    - button "Tagliandi" [ref=e904] [cursor=pointer]:
                      - img [ref=e905]
                    - link "Documenti" [ref=e908] [cursor=pointer]:
                      - /url: /documenti?marca=Sistemi&modello=SCA
                      - img [ref=e909]
                    - link "Lavorazioni" [ref=e911] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1c4dda57-7a7b-4861-a481-5902f733ad9c
                      - img [ref=e912]
                    - link "Preventivi" [ref=e914] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1c4dda57-7a7b-4861-a481-5902f733ad9c
                      - img [ref=e915]
                    - button "Stampa etichetta QR" [ref=e918] [cursor=pointer]:
                      - img [ref=e919]
              - generic [ref=e921]:
                - generic [ref=e922]:
                  - generic [ref=e923]:
                    - generic [ref=e924]:
                      - paragraph [ref=e925]: Schmidt Cleango 400 ET
                      - paragraph [ref=e926]: AMIU Bari
                    - generic [ref=e927]:
                      - paragraph [ref=e928]: N. lav.
                      - generic [ref=e929]: "2"
                  - paragraph [ref=e930]: Non assegnata · Scud. 1579
                - generic [ref=e931]:
                  - generic [ref=e932]:
                    - term [ref=e933]: Cantiere
                    - definition [ref=e934]: Bari
                  - generic [ref=e935]:
                    - term [ref=e936]: Telaio
                    - definition [ref=e937]: —
                  - generic [ref=e938]:
                    - term [ref=e939]: Ultima lavorazione
                    - definition [ref=e940]: 07 ago 2026
                - group "Ultimo aggiornamento e azioni" [ref=e941]:
                  - paragraph [ref=e944]:
                    - generic [ref=e945]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e946]:
                    - button "Dettaglio" [ref=e947] [cursor=pointer]:
                      - img [ref=e948]
                    - button "Tagliandi" [ref=e950] [cursor=pointer]:
                      - img [ref=e951]
                    - link "Documenti" [ref=e954] [cursor=pointer]:
                      - /url: /documenti?marca=Schmidt&modello=Cleango+400+ET
                      - img [ref=e955]
                    - link "Lavorazioni" [ref=e957] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1dcedd1b-b05a-4c7e-b29a-01968f338ccc
                      - img [ref=e958]
                    - link "Preventivi" [ref=e960] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1dcedd1b-b05a-4c7e-b29a-01968f338ccc
                      - img [ref=e961]
                    - button "Stampa etichetta QR" [ref=e964] [cursor=pointer]:
                      - img [ref=e965]
              - generic [ref=e967]:
                - generic [ref=e968]:
                  - generic [ref=e969]:
                    - generic [ref=e970]:
                      - paragraph [ref=e971]: AMS CL1
                      - paragraph [ref=e972]: AMIU Bari
                    - generic [ref=e973]:
                      - paragraph [ref=e974]: N. lav.
                      - generic [ref=e975]: "2"
                  - paragraph [ref=e976]: FZ583XH · Non assegnata · Scud. 1376
                - generic [ref=e977]:
                  - generic [ref=e978]:
                    - term [ref=e979]: Cantiere
                    - definition [ref=e980]: Bari
                  - generic [ref=e981]:
                    - term [ref=e982]: Telaio
                    - definition [ref=e983]:
                      - text: Iveco
                      - generic [ref=e984]: Stralis
                  - generic [ref=e985]:
                    - term [ref=e986]: Ultima lavorazione
                    - definition [ref=e987]: 21 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e988]:
                  - paragraph [ref=e991]:
                    - generic [ref=e992]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e993]:
                    - button "Dettaglio" [ref=e994] [cursor=pointer]:
                      - img [ref=e995]
                    - button "Tagliandi" [ref=e997] [cursor=pointer]:
                      - img [ref=e998]
                    - link "Documenti" [ref=e1001] [cursor=pointer]:
                      - /url: /documenti?marca=AMS&modello=CL1
                      - img [ref=e1002]
                    - link "Lavorazioni" [ref=e1004] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=1eccb590-c8b8-43d9-bc7b-1d4065b96634
                      - img [ref=e1005]
                    - link "Preventivi" [ref=e1007] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=1eccb590-c8b8-43d9-bc7b-1d4065b96634
                      - img [ref=e1008]
                    - button "Stampa etichetta QR" [ref=e1011] [cursor=pointer]:
                      - img [ref=e1012]
              - generic [ref=e1014]:
                - generic [ref=e1015]:
                  - generic [ref=e1016]:
                    - generic [ref=e1017]:
                      - paragraph [ref=e1018]: Sistemi
                      - paragraph [ref=e1019]: EcoAmbiente Sud
                    - generic [ref=e1020]:
                      - paragraph [ref=e1021]: N. lav.
                      - generic [ref=e1022]: "1"
                  - paragraph [ref=e1023]: "395"
                - generic [ref=e1024]:
                  - generic [ref=e1025]:
                    - term [ref=e1026]: Cantiere
                    - definition [ref=e1027]: Fasano
                  - generic [ref=e1028]:
                    - term [ref=e1029]: Telaio
                    - definition [ref=e1030]: —
                  - generic [ref=e1031]:
                    - term [ref=e1032]: Ultima lavorazione
                    - definition [ref=e1033]: 23 apr 2026
                - group "Ultimo aggiornamento e azioni" [ref=e1034]:
                  - paragraph [ref=e1037]:
                    - generic [ref=e1038]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e1039]:
                    - button "Dettaglio" [ref=e1040] [cursor=pointer]:
                      - img [ref=e1041]
                    - button "Tagliandi" [ref=e1043] [cursor=pointer]:
                      - img [ref=e1044]
                    - link "Documenti" [ref=e1047] [cursor=pointer]:
                      - /url: /documenti?marca=Sistemi&modello=%E2%80%94
                      - img [ref=e1048]
                    - link "Lavorazioni" [ref=e1050] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=2235df04-5fb4-4c36-928e-ace8288bd70c
                      - img [ref=e1051]
                    - link "Preventivi" [ref=e1053] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=2235df04-5fb4-4c36-928e-ace8288bd70c
                      - img [ref=e1054]
                    - button "Stampa etichetta QR" [ref=e1057] [cursor=pointer]:
                      - img [ref=e1058]
              - generic [ref=e1060]:
                - generic [ref=e1061]:
                  - generic [ref=e1062]:
                    - generic [ref=e1063]:
                      - paragraph [ref=e1064]: MEC CL.120.83.1Z1
                      - paragraph [ref=e1065]: EcoAmbiente Sud
                    - generic [ref=e1066]:
                      - paragraph [ref=e1067]: N. lav.
                      - generic [ref=e1068]: "1"
                  - paragraph [ref=e1069]: "70188038"
                - generic [ref=e1070]:
                  - generic [ref=e1071]:
                    - term [ref=e1072]: Cantiere
                    - definition [ref=e1073]: Fasano
                  - generic [ref=e1074]:
                    - term [ref=e1075]: Telaio
                    - definition [ref=e1076]: —
                  - generic [ref=e1077]:
                    - term [ref=e1078]: Ultima lavorazione
                    - definition [ref=e1079]: 22 mag 2026
                - group "Ultimo aggiornamento e azioni" [ref=e1080]:
                  - paragraph [ref=e1083]:
                    - generic [ref=e1084]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e1085]:
                    - button "Dettaglio" [ref=e1086] [cursor=pointer]:
                      - img [ref=e1087]
                    - button "Tagliandi" [ref=e1089] [cursor=pointer]:
                      - img [ref=e1090]
                    - link "Documenti" [ref=e1093] [cursor=pointer]:
                      - /url: /documenti?marca=MEC&modello=CL.120.83.1Z1
                      - img [ref=e1094]
                    - link "Lavorazioni" [ref=e1096] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=22717505-bd5c-4a99-b9b2-62c519ca194c
                      - img [ref=e1097]
                    - link "Preventivi" [ref=e1099] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=22717505-bd5c-4a99-b9b2-62c519ca194c
                      - img [ref=e1100]
                    - button "Stampa etichetta QR" [ref=e1103] [cursor=pointer]:
                      - img [ref=e1104]
              - generic [ref=e1106]:
                - generic [ref=e1107]:
                  - generic [ref=e1108]:
                    - generic [ref=e1109]:
                      - paragraph [ref=e1110]: Impianto Acq
                      - paragraph [ref=e1111]: A.V.R. S.p.A.
                    - generic [ref=e1112]:
                      - paragraph [ref=e1113]: N. lav.
                      - generic [ref=e1114]: "1"
                  - paragraph [ref=e1115]: Non assegnata
                - generic [ref=e1116]:
                  - generic [ref=e1117]:
                    - term [ref=e1118]: Cantiere
                    - definition [ref=e1119]: Acquaviva delle Fonti (Ba)
                  - generic [ref=e1120]:
                    - term [ref=e1121]: Telaio
                    - definition [ref=e1122]: —
                  - generic [ref=e1123]:
                    - term [ref=e1124]: Ultima lavorazione
                    - definition [ref=e1125]: 18 giu 2026
                - group "Ultimo aggiornamento e azioni" [ref=e1126]:
                  - paragraph [ref=e1129]:
                    - generic [ref=e1130]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e1131]:
                    - button "Dettaglio" [ref=e1132] [cursor=pointer]:
                      - img [ref=e1133]
                    - button "Tagliandi" [ref=e1135] [cursor=pointer]:
                      - img [ref=e1136]
                    - link "Documenti" [ref=e1139] [cursor=pointer]:
                      - /url: /documenti?marca=Impianto+Acq&modello=%E2%80%94
                      - img [ref=e1140]
                    - link "Lavorazioni" [ref=e1142] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=2764df6f-002e-4ff7-bd1e-1f8de2e2f186
                      - img [ref=e1143]
                    - link "Preventivi" [ref=e1145] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=2764df6f-002e-4ff7-bd1e-1f8de2e2f186
                      - img [ref=e1146]
                    - button "Stampa etichetta QR" [ref=e1149] [cursor=pointer]:
                      - img [ref=e1150]
              - generic [ref=e1152]:
                - generic [ref=e1153]:
                  - generic [ref=e1154]:
                    - generic [ref=e1155]:
                      - paragraph [ref=e1156]: Longo
                      - paragraph [ref=e1157]: AMIU Bari
                    - generic [ref=e1158]:
                      - paragraph [ref=e1159]: N. lav.
                      - generic [ref=e1160]: "1"
                  - paragraph [ref=e1161]: FK012MM · 165/340 · Scud. 1279
                - generic [ref=e1162]:
                  - generic [ref=e1163]:
                    - term [ref=e1164]: Cantiere
                    - definition [ref=e1165]: Bari
                  - generic [ref=e1166]:
                    - term [ref=e1167]: Telaio
                    - definition [ref=e1168]:
                      - text: Mercedes
                      - generic [ref=e1169]: ECONIC
                  - generic [ref=e1170]:
                    - term [ref=e1171]: Ultima lavorazione
                    - definition [ref=e1172]: 03 ago 2026
                - group "Ultimo aggiornamento e azioni" [ref=e1173]:
                  - paragraph [ref=e1176]:
                    - generic [ref=e1177]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e1178]:
                    - button "Dettaglio" [ref=e1179] [cursor=pointer]:
                      - img [ref=e1180]
                    - button "Tagliandi" [ref=e1182] [cursor=pointer]:
                      - img [ref=e1183]
                    - link "Documenti" [ref=e1186] [cursor=pointer]:
                      - /url: /documenti?marca=Longo&modello=%E2%80%94
                      - img [ref=e1187]
                    - link "Lavorazioni" [ref=e1189] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=2ab10221-22c1-4348-b3d1-a09bf8e4c16c
                      - img [ref=e1190]
                    - link "Preventivi" [ref=e1192] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=2ab10221-22c1-4348-b3d1-a09bf8e4c16c
                      - img [ref=e1193]
                    - button "Stampa etichetta QR" [ref=e1196] [cursor=pointer]:
                      - img [ref=e1197]
              - generic [ref=e1199]:
                - generic [ref=e1200]:
                  - generic [ref=e1201]:
                    - generic [ref=e1202]:
                      - paragraph [ref=e1203]: Coseco K1 R
                      - paragraph [ref=e1204]: Bellizzi SpA
                      - paragraph [ref=e1205]: AMIU Trani SpA
                    - generic [ref=e1206]:
                      - paragraph [ref=e1207]: N. lav.
                      - generic [ref=e1208]: "1"
                  - paragraph [ref=e1209]: EY909SL · 332/14
                - generic [ref=e1210]:
                  - generic [ref=e1211]:
                    - term [ref=e1212]: Cantiere
                    - definition [ref=e1213]: Trani
                  - generic [ref=e1214]:
                    - term [ref=e1215]: Telaio
                    - definition [ref=e1216]:
                      - text: Iveco
                      - generic [ref=e1217]: Daily 35
                  - generic [ref=e1218]:
                    - term [ref=e1219]: Ultima lavorazione
                    - definition [ref=e1220]: 20 lug 2026
                - group "Ultimo aggiornamento e azioni" [ref=e1221]:
                  - paragraph [ref=e1224]:
                    - generic [ref=e1225]: "Ultima modifica:"
                    - text: 06/08/26
                  - generic [ref=e1226]:
                    - button "Dettaglio" [ref=e1227] [cursor=pointer]:
                      - img [ref=e1228]
                    - button "Tagliandi" [ref=e1230] [cursor=pointer]:
                      - img [ref=e1231]
                    - link "Documenti" [ref=e1234] [cursor=pointer]:
                      - /url: /documenti?marca=Coseco&modello=K1+R
                      - img [ref=e1235]
                    - link "Lavorazioni" [ref=e1237] [cursor=pointer]:
                      - /url: /lavorazioni?mezzoId=2e1d2d45-fcd0-40ae-a45e-6c7d7df45119
                      - img [ref=e1238]
                    - link "Preventivi" [ref=e1240] [cursor=pointer]:
                      - /url: /preventivi?prevMezzo=2e1d2d45-fcd0-40ae-a45e-6c7d7df45119
                      - img [ref=e1241]
                    - button "Stampa etichetta QR" [ref=e1244] [cursor=pointer]:
                      - img [ref=e1245]
            - generic [ref=e1247]:
              - paragraph [ref=e1248]: Mostrando 1–25 di 132 risultati
              - navigation "Paginazione" [ref=e1249]:
                - button "Pagina precedente" [disabled]: ‹ Prec.
                - generic [ref=e1250]:
                  - text: "1"
                  - generic [ref=e1251]: /
                  - text: "6"
                - button "Pagina successiva" [ref=e1252] [cursor=pointer]: Succ. ›
  - generic:
    - tooltip "Documenti"
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