# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-modal-scroll.spec.ts >> mobile log drawer scroll host scrolls content
- Location: e2e\smoke\04-modal-scroll.spec.ts:265:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Log modifiche' })

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
          - heading "Magazzino ricambi" [level=1]
        - button "Azioni pagina" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e51]: Azioni pagina
      - generic [ref=e55]:
        - region "Azioni e filtri magazzino" [ref=e56]:
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e62]:
                - generic:
                  - img
                - combobox "Cerca in magazzino" [ref=e63]
              - generic [ref=e64]:
                - generic [ref=e66]:
                  - button "Nuovo" [ref=e67] [cursor=pointer]:
                    - generic [ref=e68]:
                      - img [ref=e69]
                      - generic [ref=e71]: Nuovo
                  - button "Acquisizione DDT con AI" [ref=e72] [cursor=pointer]:
                    - img [ref=e74]
                    - generic [ref=e76]: DDT AI
                - button "Filtri" [ref=e79] [cursor=pointer]:
                  - img [ref=e80]
            - generic [ref=e85]:
              - switch "Modifica" [checked] [ref=e86] [cursor=pointer]:
                - generic [ref=e87]: Modifica
              - switch "Etichette" [ref=e90] [cursor=pointer]:
                - generic [ref=e91]: Etichette
        - generic [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - generic [ref=e100]: AMS
                  - paragraph [ref=e101]: Sensore Prossimità D18 con Connettore
                  - paragraph [ref=e103]: XS518B1PAM12
                  - paragraph [ref=e104]: AMS (Universale)
                - generic [ref=e105]:
                  - generic "Giacenza 0" [ref=e107]:
                    - generic [ref=e108]: "0"
                  - generic "Scorta minima 0" [ref=e109]:
                    - generic [ref=e110]: "0"
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - term [ref=e113]: Categoria
                  - definition [ref=e114]: Sensori
                - generic [ref=e115]:
                  - term [ref=e116]: P. vendita
                  - definition [ref=e117]: 0,00 €
                - generic [ref=e118]:
                  - term [ref=e119]: Consumo medio
                  - definition [ref=e120]:
                    - generic [ref=e121]: —
              - generic [ref=e122]:
                - generic [ref=e123]:
                  - paragraph [ref=e125]: 02/09/26, 16:58
                  - paragraph [ref=e126]: Giorgio Namoini
                - group "Azioni" [ref=e127]:
                  - button "Info" [ref=e128] [cursor=pointer]:
                    - img [ref=e129]
                  - button "Scarico" [ref=e131] [cursor=pointer]:
                    - img [ref=e132]
                  - button "Carico" [ref=e133] [cursor=pointer]:
                    - img [ref=e134]
            - generic [ref=e136]:
              - generic [ref=e137]:
                - generic [ref=e138]:
                  - generic [ref=e139]: OMB
                  - paragraph [ref=e140]: Sensore di Prossimità SN=8
                  - paragraph [ref=e142]: "0E131701"
                  - paragraph [ref=e143]: Compatibilità universale
                - generic [ref=e144]:
                  - generic "Giacenza 0" [ref=e146]:
                    - generic [ref=e147]: "0"
                  - generic "Scorta minima 0" [ref=e148]:
                    - generic [ref=e149]: "0"
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - term [ref=e152]: Categoria
                  - definition [ref=e153]: Sensori
                - generic [ref=e154]:
                  - term [ref=e155]: P. vendita
                  - definition [ref=e156]: 40,04 €
                - generic [ref=e157]:
                  - term [ref=e158]: Consumo medio
                  - definition [ref=e159]:
                    - generic [ref=e160]: —
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - paragraph [ref=e164]: 02/09/26, 16:29
                  - paragraph [ref=e165]: Giorgio Namoini
                - group "Azioni" [ref=e166]:
                  - button "Info" [ref=e167] [cursor=pointer]:
                    - img [ref=e168]
                  - button "Scarico" [ref=e170] [cursor=pointer]:
                    - img [ref=e171]
                  - button "Carico" [ref=e172] [cursor=pointer]:
                    - img [ref=e173]
            - generic [ref=e175]:
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - generic [ref=e178]: OMB
                  - paragraph [ref=e179]: Sensore di Prossimità M30x1,5
                  - paragraph [ref=e181]: 0E130130B20T
                  - paragraph [ref=e182]: Compatibilità universale
                - generic [ref=e183]:
                  - generic "Giacenza 0" [ref=e185]:
                    - generic [ref=e186]: "0"
                  - generic "Scorta minima 0" [ref=e187]:
                    - generic [ref=e188]: "0"
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - term [ref=e191]: Categoria
                  - definition [ref=e192]: Sensori
                - generic [ref=e193]:
                  - term [ref=e194]: P. vendita
                  - definition [ref=e195]: 0,00 €
                - generic [ref=e196]:
                  - term [ref=e197]: Consumo medio
                  - definition [ref=e198]:
                    - generic [ref=e199]: —
              - generic [ref=e200]:
                - generic [ref=e201]:
                  - paragraph [ref=e203]: 02/09/26, 15:03
                  - paragraph [ref=e204]: Giorgio Namoini
                - group "Azioni" [ref=e205]:
                  - button "Info" [ref=e206] [cursor=pointer]:
                    - img [ref=e207]
                  - button "Scarico" [ref=e209] [cursor=pointer]:
                    - img [ref=e210]
                  - button "Carico" [ref=e211] [cursor=pointer]:
                    - img [ref=e212]
            - generic [ref=e214]:
              - generic [ref=e215]:
                - generic [ref=e216]:
                  - generic [ref=e217]: OMB
                  - paragraph [ref=e218]: Cavo Pin 4 Poli
                  - paragraph [ref=e220]: "0E073303"
                  - paragraph [ref=e221]: Compatibilità universale
                - generic [ref=e222]:
                  - generic "Giacenza 0" [ref=e224]:
                    - generic [ref=e225]: "0"
                  - generic "Scorta minima 0" [ref=e226]:
                    - generic [ref=e227]: "0"
              - generic [ref=e228]:
                - generic [ref=e229]:
                  - term [ref=e230]: Categoria
                  - definition [ref=e231]: Sensori
                - generic [ref=e232]:
                  - term [ref=e233]: P. vendita
                  - definition [ref=e234]: 0,00 €
                - generic [ref=e235]:
                  - term [ref=e236]: Consumo medio
                  - definition [ref=e237]:
                    - generic [ref=e238]: —
              - generic [ref=e239]:
                - generic [ref=e240]:
                  - paragraph [ref=e242]: 02/09/26, 15:02
                  - paragraph [ref=e243]: Giorgio Namoini
                - group "Azioni" [ref=e244]:
                  - button "Info" [ref=e245] [cursor=pointer]:
                    - img [ref=e246]
                  - button "Scarico" [ref=e248] [cursor=pointer]:
                    - img [ref=e249]
                  - button "Carico" [ref=e250] [cursor=pointer]:
                    - img [ref=e251]
            - generic [ref=e253]:
              - generic [ref=e254]:
                - generic [ref=e255]:
                  - paragraph [ref=e256]: Grasso (Secchia)
                  - paragraph [ref=e257]: Compatibilità universale
                - generic [ref=e258]:
                  - generic "Giacenza 1" [ref=e260]:
                    - generic [ref=e261]: "1"
                  - generic "Scorta minima 0" [ref=e262]:
                    - generic [ref=e263]: "0"
              - generic [ref=e264]:
                - generic [ref=e265]:
                  - term [ref=e266]: Categoria
                  - definition [ref=e267]: Altro
                - generic [ref=e268]:
                  - term [ref=e269]: P. vendita
                  - definition [ref=e270]: 0,00 €
                - generic [ref=e271]:
                  - term [ref=e272]: Consumo medio
                  - definition [ref=e273]:
                    - generic [ref=e274]: —
              - generic [ref=e275]:
                - generic [ref=e276]:
                  - paragraph [ref=e278]: 01/09/26, 19:17
                  - paragraph [ref=e279]: Giorgio Namoini
                - group "Azioni" [ref=e280]:
                  - button "Info" [ref=e281] [cursor=pointer]:
                    - img [ref=e282]
                  - button "Scarico" [ref=e284] [cursor=pointer]:
                    - img [ref=e285]
                  - button "Carico" [ref=e286] [cursor=pointer]:
                    - img [ref=e287]
            - generic [ref=e289]:
              - generic [ref=e290]:
                - generic [ref=e291]:
                  - paragraph [ref=e292]: Liquido Antigelo
                  - paragraph [ref=e293]: Compatibilità universale
                - generic [ref=e294]:
                  - generic "Giacenza 10" [ref=e296]:
                    - generic [ref=e297]: "10"
                  - generic "Scorta minima 0" [ref=e298]:
                    - generic [ref=e299]: "0"
              - generic [ref=e300]:
                - generic [ref=e301]:
                  - term [ref=e302]: Categoria
                  - definition [ref=e303]: Motore
                - generic [ref=e304]:
                  - term [ref=e305]: P. vendita
                  - definition [ref=e306]: 0,00 €
                - generic [ref=e307]:
                  - term [ref=e308]: Consumo medio
                  - definition [ref=e309]:
                    - generic [ref=e310]: —
              - generic [ref=e311]:
                - generic [ref=e312]:
                  - paragraph [ref=e314]: 01/09/26, 19:17
                  - paragraph [ref=e315]: Giorgio Namoini
                - group "Azioni" [ref=e316]:
                  - button "Info" [ref=e317] [cursor=pointer]:
                    - img [ref=e318]
                  - button "Scarico" [ref=e320] [cursor=pointer]:
                    - img [ref=e321]
                  - button "Carico" [ref=e322] [cursor=pointer]:
                    - img [ref=e323]
            - generic [ref=e325]:
              - generic [ref=e326]:
                - generic [ref=e327]:
                  - paragraph [ref=e328]: Tubo Flessibile R2T 1000
                  - paragraph [ref=e329]: Compatibilità universale
                - generic [ref=e330]:
                  - generic "Giacenza 1" [ref=e332]:
                    - generic [ref=e333]: "1"
                  - generic "Scorta minima 0" [ref=e334]:
                    - generic [ref=e335]: "0"
              - generic [ref=e336]:
                - generic [ref=e337]:
                  - term [ref=e338]: Categoria
                  - definition [ref=e339]: Altro
                - generic [ref=e340]:
                  - term [ref=e341]: P. vendita
                  - definition [ref=e342]: 0,00 €
                - generic [ref=e343]:
                  - term [ref=e344]: Consumo medio
                  - definition [ref=e345]:
                    - generic [ref=e346]: —
              - generic [ref=e347]:
                - generic [ref=e348]:
                  - paragraph [ref=e350]: 01/09/26, 19:17
                  - paragraph [ref=e351]: Giorgio Namoini
                - group "Azioni" [ref=e352]:
                  - button "Info" [ref=e353] [cursor=pointer]:
                    - img [ref=e354]
                  - button "Scarico" [ref=e356] [cursor=pointer]:
                    - img [ref=e357]
                  - button "Carico" [ref=e358] [cursor=pointer]:
                    - img [ref=e359]
            - generic [ref=e361]:
              - generic [ref=e362]:
                - generic [ref=e363]:
                  - paragraph [ref=e364]: Connettori con Luce a Led
                  - paragraph [ref=e365]: Compatibilità universale
                - generic [ref=e366]:
                  - generic "Giacenza 3" [ref=e368]:
                    - generic [ref=e369]: "3"
                  - generic "Scorta minima 0" [ref=e370]:
                    - generic [ref=e371]: "0"
              - generic [ref=e372]:
                - generic [ref=e373]:
                  - term [ref=e374]: Categoria
                  - definition [ref=e375]: Elettronica
                - generic [ref=e376]:
                  - term [ref=e377]: P. vendita
                  - definition [ref=e378]: 0,00 €
                - generic [ref=e379]:
                  - term [ref=e380]: Consumo medio
                  - definition [ref=e381]:
                    - generic [ref=e382]: —
              - generic [ref=e383]:
                - generic [ref=e384]:
                  - paragraph [ref=e386]: 01/09/26, 19:17
                  - paragraph [ref=e387]: Giorgio
                - group "Azioni" [ref=e388]:
                  - button "Info" [ref=e389] [cursor=pointer]:
                    - img [ref=e390]
                  - button "Scarico" [ref=e392] [cursor=pointer]:
                    - img [ref=e393]
                  - button "Carico" [ref=e394] [cursor=pointer]:
                    - img [ref=e395]
            - generic [ref=e397]:
              - generic [ref=e398]:
                - generic [ref=e399]:
                  - paragraph [ref=e400]: Olio ATF (Idroguida / Cambio DU5000)
                  - paragraph [ref=e401]: Compatibilità universale
                - generic [ref=e402]:
                  - generic "Giacenza 25" [ref=e404]:
                    - generic [ref=e405]: "25"
                  - generic "Scorta minima 0" [ref=e406]:
                    - generic [ref=e407]: "0"
              - generic [ref=e408]:
                - generic [ref=e409]:
                  - term [ref=e410]: Categoria
                  - definition [ref=e411]: Motore
                - generic [ref=e412]:
                  - term [ref=e413]: P. vendita
                  - definition [ref=e414]: 0,00 €
                - generic [ref=e415]:
                  - term [ref=e416]: Consumo medio
                  - definition [ref=e417]:
                    - generic [ref=e418]: —
              - generic [ref=e419]:
                - generic [ref=e420]:
                  - paragraph [ref=e422]: 01/09/26, 19:17
                  - paragraph [ref=e423]: Giorgio Namoini
                - group "Azioni" [ref=e424]:
                  - button "Info" [ref=e425] [cursor=pointer]:
                    - img [ref=e426]
                  - button "Scarico" [ref=e428] [cursor=pointer]:
                    - img [ref=e429]
                  - button "Carico" [ref=e430] [cursor=pointer]:
                    - img [ref=e431]
            - generic [ref=e433]:
              - generic [ref=e434]:
                - generic [ref=e435]:
                  - paragraph [ref=e436]: Olio 80/90 (Cambio)
                  - paragraph [ref=e437]: Compatibilità universale
                - generic [ref=e438]:
                  - generic "Giacenza 20" [ref=e440]:
                    - generic [ref=e441]: "20"
                  - generic "Scorta minima 0" [ref=e442]:
                    - generic [ref=e443]: "0"
              - generic [ref=e444]:
                - generic [ref=e445]:
                  - term [ref=e446]: Categoria
                  - definition [ref=e447]: Motore
                - generic [ref=e448]:
                  - term [ref=e449]: P. vendita
                  - definition [ref=e450]: 0,00 €
                - generic [ref=e451]:
                  - term [ref=e452]: Consumo medio
                  - definition [ref=e453]:
                    - generic [ref=e454]: —
              - generic [ref=e455]:
                - generic [ref=e456]:
                  - paragraph [ref=e458]: 01/09/26, 19:17
                  - paragraph [ref=e459]: Giorgio Namoini
                - group "Azioni" [ref=e460]:
                  - button "Info" [ref=e461] [cursor=pointer]:
                    - img [ref=e462]
                  - button "Scarico" [ref=e464] [cursor=pointer]:
                    - img [ref=e465]
                  - button "Carico" [ref=e466] [cursor=pointer]:
                    - img [ref=e467]
            - generic [ref=e469]:
              - generic [ref=e470]:
                - generic [ref=e471]:
                  - generic [ref=e472]: Locatelli
                  - paragraph [ref=e473]: Gruppo Pompe Centralina (Pompa Tandem GHPA2-D-50 + ALPP2-D-2)
                  - paragraph [ref=e474]: Compatibilità universale
                - generic [ref=e475]:
                  - generic "Giacenza 0" [ref=e477]:
                    - generic [ref=e478]: "0"
                  - generic "Scorta minima 0" [ref=e479]:
                    - generic [ref=e480]: "0"
              - generic [ref=e481]:
                - generic [ref=e482]:
                  - term [ref=e483]: Categoria
                  - definition [ref=e484]: Idraulica
                - generic [ref=e485]:
                  - term [ref=e486]: P. vendita
                  - definition [ref=e487]: 3480,00 €
                - generic [ref=e488]:
                  - term [ref=e489]: Consumo medio
                  - definition [ref=e490]:
                    - generic [ref=e491]: —
              - generic [ref=e492]:
                - generic [ref=e493]:
                  - paragraph [ref=e495]: 01/09/26, 19:17
                  - paragraph [ref=e496]: Giorgio Namoini
                - group "Azioni" [ref=e497]:
                  - button "Info" [ref=e498] [cursor=pointer]:
                    - img [ref=e499]
                  - button "Scarico" [ref=e501] [cursor=pointer]:
                    - img [ref=e502]
                  - button "Carico" [ref=e503] [cursor=pointer]:
                    - img [ref=e504]
            - generic [ref=e506]:
              - generic [ref=e507]:
                - generic [ref=e508]:
                  - paragraph [ref=e509]: Olio Idraulico 48 (Fusti)
                  - paragraph [ref=e510]: Compatibilità universale
                - generic [ref=e511]:
                  - generic "Giacenza 208" [ref=e513]:
                    - generic [ref=e514]: "208"
                  - generic "Scorta minima 0" [ref=e515]:
                    - generic [ref=e516]: "0"
              - generic [ref=e517]:
                - generic [ref=e518]:
                  - term [ref=e519]: Categoria
                  - definition [ref=e520]: Motore
                - generic [ref=e521]:
                  - term [ref=e522]: P. vendita
                  - definition [ref=e523]: 0,00 €
                - generic [ref=e524]:
                  - term [ref=e525]: Consumo medio
                  - definition [ref=e526]:
                    - generic [ref=e527]: —
              - generic [ref=e528]:
                - generic [ref=e529]:
                  - paragraph [ref=e531]: 01/09/26, 19:17
                  - paragraph [ref=e532]: Giorgio Namoini
                - group "Azioni" [ref=e533]:
                  - button "Info" [ref=e534] [cursor=pointer]:
                    - img [ref=e535]
                  - button "Scarico" [ref=e537] [cursor=pointer]:
                    - img [ref=e538]
                  - button "Carico" [ref=e539] [cursor=pointer]:
                    - img [ref=e540]
            - generic [ref=e542]:
              - generic [ref=e543]:
                - generic [ref=e544]:
                  - paragraph [ref=e545]: Olio Motore 10/40
                  - paragraph [ref=e546]: Compatibilità universale
                - generic [ref=e547]:
                  - generic "Giacenza 20" [ref=e549]:
                    - generic [ref=e550]: "20"
                  - generic "Scorta minima 0" [ref=e551]:
                    - generic [ref=e552]: "0"
              - generic [ref=e553]:
                - generic [ref=e554]:
                  - term [ref=e555]: Categoria
                  - definition [ref=e556]: Motore
                - generic [ref=e557]:
                  - term [ref=e558]: P. vendita
                  - definition [ref=e559]: 0,00 €
                - generic [ref=e560]:
                  - term [ref=e561]: Consumo medio
                  - definition [ref=e562]:
                    - generic [ref=e563]: —
              - generic [ref=e564]:
                - generic [ref=e565]:
                  - paragraph [ref=e567]: 01/09/26, 19:17
                  - paragraph [ref=e568]: Giorgio Namoini
                - group "Azioni" [ref=e569]:
                  - button "Info" [ref=e570] [cursor=pointer]:
                    - img [ref=e571]
                  - button "Scarico" [ref=e573] [cursor=pointer]:
                    - img [ref=e574]
                  - button "Carico" [ref=e575] [cursor=pointer]:
                    - img [ref=e576]
            - generic [ref=e578]:
              - generic [ref=e579]:
                - generic [ref=e580]:
                  - paragraph [ref=e581]: Olio Matic (Cambio Automatico)
                  - paragraph [ref=e582]: Compatibilità universale
                - generic [ref=e583]:
                  - generic "Giacenza 20" [ref=e585]:
                    - generic [ref=e586]: "20"
                  - generic "Scorta minima 0" [ref=e587]:
                    - generic [ref=e588]: "0"
              - generic [ref=e589]:
                - generic [ref=e590]:
                  - term [ref=e591]: Categoria
                  - definition [ref=e592]: Motore
                - generic [ref=e593]:
                  - term [ref=e594]: P. vendita
                  - definition [ref=e595]: 0,00 €
                - generic [ref=e596]:
                  - term [ref=e597]: Consumo medio
                  - definition [ref=e598]:
                    - generic [ref=e599]: —
              - generic [ref=e600]:
                - generic [ref=e601]:
                  - paragraph [ref=e603]: 01/09/26, 19:17
                  - paragraph [ref=e604]: Giorgio Namoini
                - group "Azioni" [ref=e605]:
                  - button "Info" [ref=e606] [cursor=pointer]:
                    - img [ref=e607]
                  - button "Scarico" [ref=e609] [cursor=pointer]:
                    - img [ref=e610]
                  - button "Carico" [ref=e611] [cursor=pointer]:
                    - img [ref=e612]
            - generic [ref=e614]:
              - generic [ref=e615]:
                - generic [ref=e616]:
                  - generic [ref=e617]: Schmidt
                  - paragraph [ref=e618]: Adattatore Motore Turbina
                  - paragraph [ref=e620]: 0229502-0
                  - paragraph [ref=e621]: Schmidt (Universale)
                - generic [ref=e622]:
                  - generic "Giacenza 0" [ref=e624]:
                    - generic [ref=e625]: "0"
                  - generic "Scorta minima 0" [ref=e626]:
                    - generic [ref=e627]: "0"
              - generic [ref=e628]:
                - generic [ref=e629]:
                  - term [ref=e630]: Categoria
                  - definition [ref=e631]: Altro
                - generic [ref=e632]:
                  - term [ref=e633]: P. vendita
                  - definition [ref=e634]: 23,72 €
                - generic [ref=e635]:
                  - term [ref=e636]: Consumo medio
                  - definition [ref=e637]:
                    - generic [ref=e638]: —
              - generic [ref=e639]:
                - generic [ref=e640]:
                  - paragraph [ref=e642]: 01/09/26, 19:17
                  - paragraph [ref=e643]: Giorgio Namoini
                - group "Azioni" [ref=e644]:
                  - button "Info" [ref=e645] [cursor=pointer]:
                    - img [ref=e646]
                  - button "Scarico" [ref=e648] [cursor=pointer]:
                    - img [ref=e649]
                  - button "Carico" [ref=e650] [cursor=pointer]:
                    - img [ref=e651]
            - generic [ref=e653]:
              - generic [ref=e654]:
                - generic [ref=e655]:
                  - generic [ref=e656]: Schmidt
                  - paragraph [ref=e657]: Ferma Tubo Flangiato Motore Turbina
                  - paragraph [ref=e659]: 02296503-1
                  - paragraph [ref=e660]: Schmidt (Universale)
                - generic [ref=e661]:
                  - generic "Giacenza 0" [ref=e663]:
                    - generic [ref=e664]: "0"
                  - generic "Scorta minima 0" [ref=e665]:
                    - generic [ref=e666]: "0"
              - generic [ref=e667]:
                - generic [ref=e668]:
                  - term [ref=e669]: Categoria
                  - definition [ref=e670]: Altro
                - generic [ref=e671]:
                  - term [ref=e672]: P. vendita
                  - definition [ref=e673]: 0,00 €
                - generic [ref=e674]:
                  - term [ref=e675]: Consumo medio
                  - definition [ref=e676]:
                    - generic [ref=e677]: —
              - generic [ref=e678]:
                - generic [ref=e679]:
                  - paragraph [ref=e681]: 01/09/26, 19:17
                  - paragraph [ref=e682]: Giorgio Namoini
                - group "Azioni" [ref=e683]:
                  - button "Info" [ref=e684] [cursor=pointer]:
                    - img [ref=e685]
                  - button "Scarico" [ref=e687] [cursor=pointer]:
                    - img [ref=e688]
                  - button "Carico" [ref=e689] [cursor=pointer]:
                    - img [ref=e690]
            - generic [ref=e692]:
              - generic [ref=e693]:
                - generic [ref=e694]:
                  - generic [ref=e695]: Schmidt
                  - paragraph [ref=e696]: Cartuccia Filtro Olio Idraulico
                  - paragraph [ref=e698]: 0242528-8
                  - paragraph [ref=e699]: Cleango 500 E6C
                - generic [ref=e700]:
                  - generic "Giacenza 0" [ref=e702]:
                    - generic [ref=e703]: "0"
                  - generic "Scorta minima 0" [ref=e704]:
                    - generic [ref=e705]: "0"
              - generic [ref=e706]:
                - generic [ref=e707]:
                  - term [ref=e708]: Categoria
                  - definition [ref=e709]: Filtrazione
                - generic [ref=e710]:
                  - term [ref=e711]: P. vendita
                  - definition [ref=e712]: 0,00 €
                - generic [ref=e713]:
                  - term [ref=e714]: Consumo medio
                  - definition [ref=e715]:
                    - generic [ref=e716]: —
              - generic [ref=e717]:
                - generic [ref=e718]:
                  - paragraph [ref=e720]: 01/09/26, 19:17
                  - paragraph [ref=e721]: Giorgio Namoini
                - group "Azioni" [ref=e722]:
                  - button "Info" [ref=e723] [cursor=pointer]:
                    - img [ref=e724]
                  - button "Scarico" [ref=e726] [cursor=pointer]:
                    - img [ref=e727]
                  - button "Carico" [ref=e728] [cursor=pointer]:
                    - img [ref=e729]
            - generic [ref=e731]:
              - generic [ref=e732]:
                - generic [ref=e733]:
                  - generic [ref=e734]: Schmidt
                  - paragraph [ref=e735]: Cinghia Clima
                  - paragraph [ref=e737]: 0270398-1
                  - paragraph [ref=e738]: Cleango 500 E6C
                - generic [ref=e739]:
                  - generic "Giacenza 0" [ref=e741]:
                    - generic [ref=e742]: "0"
                  - generic "Scorta minima 0" [ref=e743]:
                    - generic [ref=e744]: "0"
              - generic [ref=e745]:
                - generic [ref=e746]:
                  - term [ref=e747]: Categoria
                  - definition [ref=e748]: Motore
                - generic [ref=e749]:
                  - term [ref=e750]: P. vendita
                  - definition [ref=e751]: 0,00 €
                - generic [ref=e752]:
                  - term [ref=e753]: Consumo medio
                  - definition [ref=e754]:
                    - generic [ref=e755]: —
              - generic [ref=e756]:
                - generic [ref=e757]:
                  - paragraph [ref=e759]: 01/09/26, 19:17
                  - paragraph [ref=e760]: Giorgio Namoini
                - group "Azioni" [ref=e761]:
                  - button "Info" [ref=e762] [cursor=pointer]:
                    - img [ref=e763]
                  - button "Scarico" [ref=e765] [cursor=pointer]:
                    - img [ref=e766]
                  - button "Carico" [ref=e767] [cursor=pointer]:
                    - img [ref=e768]
            - generic [ref=e770]:
              - generic [ref=e771]:
                - generic [ref=e772]:
                  - generic [ref=e773]: Schmidt
                  - paragraph [ref=e774]: Raccordo a 90° R1/4
                  - paragraph [ref=e776]: 0287022-8
                  - paragraph [ref=e777]: Schmidt (Universale)
                - generic [ref=e778]:
                  - generic "Giacenza 0" [ref=e780]:
                    - generic [ref=e781]: "0"
                  - generic "Scorta minima 0" [ref=e782]:
                    - generic [ref=e783]: "0"
              - generic [ref=e784]:
                - generic [ref=e785]:
                  - term [ref=e786]: Categoria
                  - definition [ref=e787]: Altro
                - generic [ref=e788]:
                  - term [ref=e789]: P. vendita
                  - definition [ref=e790]: 19,49 €
                - generic [ref=e791]:
                  - term [ref=e792]: Consumo medio
                  - definition [ref=e793]:
                    - generic [ref=e794]: —
              - generic [ref=e795]:
                - generic [ref=e796]:
                  - paragraph [ref=e798]: 01/09/26, 19:17
                  - paragraph [ref=e799]: Giorgio Namoini
                - group "Azioni" [ref=e800]:
                  - button "Info" [ref=e801] [cursor=pointer]:
                    - img [ref=e802]
                  - button "Scarico" [ref=e804] [cursor=pointer]:
                    - img [ref=e805]
                  - button "Carico" [ref=e806] [cursor=pointer]:
                    - img [ref=e807]
            - generic [ref=e809]:
              - generic [ref=e810]:
                - generic [ref=e811]:
                  - generic [ref=e812]: Schmidt
                  - paragraph [ref=e813]: Pattino Sinistro 288x145x45
                  - paragraph [ref=e815]: 0317162-6
                  - paragraph [ref=e816]: Schmidt (Universale)
                - generic [ref=e817]:
                  - generic "Giacenza 0" [ref=e819]:
                    - generic [ref=e820]: "0"
                  - generic "Scorta minima 0" [ref=e821]:
                    - generic [ref=e822]: "0"
              - generic [ref=e823]:
                - generic [ref=e824]:
                  - term [ref=e825]: Categoria
                  - definition [ref=e826]: Altro
                - generic [ref=e827]:
                  - term [ref=e828]: P. vendita
                  - definition [ref=e829]: 0,00 €
                - generic [ref=e830]:
                  - term [ref=e831]: Consumo medio
                  - definition [ref=e832]:
                    - generic [ref=e833]: —
              - generic [ref=e834]:
                - generic [ref=e835]:
                  - paragraph [ref=e837]: 01/09/26, 19:17
                  - paragraph [ref=e838]: Giorgio Namoini
                - group "Azioni" [ref=e839]:
                  - button "Info" [ref=e840] [cursor=pointer]:
                    - img [ref=e841]
                  - button "Scarico" [ref=e843] [cursor=pointer]:
                    - img [ref=e844]
                  - button "Carico" [ref=e845] [cursor=pointer]:
                    - img [ref=e846]
            - generic [ref=e848]:
              - generic [ref=e849]:
                - generic [ref=e850]:
                  - generic [ref=e851]: Farid
                  - paragraph [ref=e852]: Sensore Interruttore Magnetico di Sicurezza
                  - paragraph [ref=e854]: "05050001027"
                  - paragraph [ref=e855]: Farid (Universale)
                - generic [ref=e856]:
                  - generic "Giacenza 4" [ref=e858]:
                    - generic [ref=e859]: "4"
                  - generic "Scorta minima 0" [ref=e860]:
                    - generic [ref=e861]: "0"
              - generic [ref=e862]:
                - generic [ref=e863]:
                  - term [ref=e864]: Categoria
                  - definition [ref=e865]: Sensori
                - generic [ref=e866]:
                  - term [ref=e867]: P. vendita
                  - definition [ref=e868]: 0,00 €
                - generic [ref=e869]:
                  - term [ref=e870]: Consumo medio
                  - definition [ref=e871]:
                    - generic [ref=e872]: —
              - generic [ref=e873]:
                - generic [ref=e874]:
                  - paragraph [ref=e876]: 01/09/26, 19:17
                  - paragraph [ref=e877]: Giorgio Namoini
                - group "Azioni" [ref=e878]:
                  - button "Info" [ref=e879] [cursor=pointer]:
                    - img [ref=e880]
                  - button "Scarico" [ref=e882] [cursor=pointer]:
                    - img [ref=e883]
                  - button "Carico" [ref=e884] [cursor=pointer]:
                    - img [ref=e885]
            - generic [ref=e887]:
              - generic [ref=e888]:
                - generic [ref=e889]:
                  - generic [ref=e890]: OMB
                  - paragraph [ref=e891]: Connettore Diritto 4 Poli L=5m
                  - paragraph [ref=e893]: "0E091402"
                  - paragraph [ref=e894]: OMB (Universale)
                - generic [ref=e895]:
                  - generic "Giacenza 20" [ref=e897]:
                    - generic [ref=e898]: "20"
                  - generic "Scorta minima 0" [ref=e899]:
                    - generic [ref=e900]: "0"
              - generic [ref=e901]:
                - generic [ref=e902]:
                  - term [ref=e903]: Categoria
                  - definition [ref=e904]: Sensori
                - generic [ref=e905]:
                  - term [ref=e906]: P. vendita
                  - definition [ref=e907]: 0,00 €
                - generic [ref=e908]:
                  - term [ref=e909]: Consumo medio
                  - definition [ref=e910]:
                    - generic [ref=e911]: —
              - generic [ref=e912]:
                - generic [ref=e913]:
                  - paragraph [ref=e915]: 01/09/26, 19:17
                  - paragraph [ref=e916]: Giorgio Namoini
                - group "Azioni" [ref=e917]:
                  - button "Info" [ref=e918] [cursor=pointer]:
                    - img [ref=e919]
                  - button "Scarico" [ref=e921] [cursor=pointer]:
                    - img [ref=e922]
                  - button "Carico" [ref=e923] [cursor=pointer]:
                    - img [ref=e924]
            - generic [ref=e926]:
              - generic [ref=e927]:
                - generic [ref=e928]:
                  - generic [ref=e929]: OMB
                  - paragraph [ref=e930]: Connettore 90 Gradi 4 Poli L=5m
                  - paragraph [ref=e932]: "0E091405"
                  - paragraph [ref=e933]: OMB (Universale)
                - generic [ref=e934]:
                  - generic "Giacenza 4" [ref=e936]:
                    - generic [ref=e937]: "4"
                  - generic "Scorta minima 0" [ref=e938]:
                    - generic [ref=e939]: "0"
              - generic [ref=e940]:
                - generic [ref=e941]:
                  - term [ref=e942]: Categoria
                  - definition [ref=e943]: Sensori
                - generic [ref=e944]:
                  - term [ref=e945]: P. vendita
                  - definition [ref=e946]: 0,00 €
                - generic [ref=e947]:
                  - term [ref=e948]: Consumo medio
                  - definition [ref=e949]:
                    - generic [ref=e950]: —
              - generic [ref=e951]:
                - generic [ref=e952]:
                  - paragraph [ref=e954]: 01/09/26, 19:17
                  - paragraph [ref=e955]: Giorgio Namoini
                - group "Azioni" [ref=e956]:
                  - button "Info" [ref=e957] [cursor=pointer]:
                    - img [ref=e958]
                  - button "Scarico" [ref=e960] [cursor=pointer]:
                    - img [ref=e961]
                  - button "Carico" [ref=e962] [cursor=pointer]:
                    - img [ref=e963]
            - generic [ref=e965]:
              - generic [ref=e966]:
                - generic [ref=e967]:
                  - generic [ref=e968]: Schmidt
                  - paragraph [ref=e969]: Gomito 90° 1/2"
                  - paragraph [ref=e971]: 1053297-0
                  - paragraph [ref=e972]: Schmidt (Universale)
                - generic [ref=e973]:
                  - generic "Giacenza 0" [ref=e975]:
                    - generic [ref=e976]: "0"
                  - generic "Scorta minima 0" [ref=e977]:
                    - generic [ref=e978]: "0"
              - generic [ref=e979]:
                - generic [ref=e980]:
                  - term [ref=e981]: Categoria
                  - definition [ref=e982]: Altro
                - generic [ref=e983]:
                  - term [ref=e984]: P. vendita
                  - definition [ref=e985]: 0,00 €
                - generic [ref=e986]:
                  - term [ref=e987]: Consumo medio
                  - definition [ref=e988]:
                    - generic [ref=e989]: —
              - generic [ref=e990]:
                - generic [ref=e991]:
                  - paragraph [ref=e993]: 01/09/26, 19:17
                  - paragraph [ref=e994]: Giorgio Namoini
                - group "Azioni" [ref=e995]:
                  - button "Info" [ref=e996] [cursor=pointer]:
                    - img [ref=e997]
                  - button "Scarico" [ref=e999] [cursor=pointer]:
                    - img [ref=e1000]
                  - button "Carico" [ref=e1001] [cursor=pointer]:
                    - img [ref=e1002]
            - generic [ref=e1004]:
              - generic [ref=e1005]:
                - generic [ref=e1006]:
                  - generic [ref=e1007]: Schmidt
                  - paragraph [ref=e1008]: Cinghia Servizi Poly-V
                  - paragraph [ref=e1010]: 1054251-2
                  - paragraph [ref=e1011]: Cleango 500 E6C
                - generic [ref=e1012]:
                  - generic "Giacenza 0" [ref=e1014]:
                    - generic [ref=e1015]: "0"
                  - generic "Scorta minima 0" [ref=e1016]:
                    - generic [ref=e1017]: "0"
              - generic [ref=e1018]:
                - generic [ref=e1019]:
                  - term [ref=e1020]: Categoria
                  - definition [ref=e1021]: Motore
                - generic [ref=e1022]:
                  - term [ref=e1023]: P. vendita
                  - definition [ref=e1024]: 0,00 €
                - generic [ref=e1025]:
                  - term [ref=e1026]: Consumo medio
                  - definition [ref=e1027]:
                    - generic [ref=e1028]: —
              - generic [ref=e1029]:
                - generic [ref=e1030]:
                  - paragraph [ref=e1032]: 01/09/26, 19:17
                  - paragraph [ref=e1033]: Giorgio Namoini
                - group "Azioni" [ref=e1034]:
                  - button "Info" [ref=e1035] [cursor=pointer]:
                    - img [ref=e1036]
                  - button "Scarico" [ref=e1038] [cursor=pointer]:
                    - img [ref=e1039]
                  - button "Carico" [ref=e1040] [cursor=pointer]:
                    - img [ref=e1041]
          - generic [ref=e1043]:
            - paragraph [ref=e1044]: Mostrando 1–25 di 107 risultati
            - navigation "Paginazione" [ref=e1045]:
              - button "Pagina precedente" [disabled]: ‹ Prec.
              - generic [ref=e1046]:
                - text: "1"
                - generic [ref=e1047]: /
                - text: "5"
              - button "Pagina successiva" [ref=e1048] [cursor=pointer]: Succ. ›
```

# Test source

```ts
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
  262 |   expect(layout.ok, JSON.stringify(layout)).toBe(true);
  263 | });
  264 | 
  265 | test("mobile log drawer scroll host scrolls content", async ({ page }) => {
  266 |   attachConsoleGuards(page);
  267 |   await page.setViewportSize({ width: 390, height: 844 });
  268 |   await loginViaUi(page, adminCredentials());
  269 |   await page.goto("/magazzino");
  270 | 
> 271 |   await page.getByRole("button", { name: "Log modifiche" }).click();
      |                                                             ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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