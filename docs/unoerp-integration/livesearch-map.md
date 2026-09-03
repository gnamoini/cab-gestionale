# Livesearch map

| Source | Field | Format | Inferred target | Evidence |
|--------|-------|--------|-----------------|----------|
| Produzione/ordini | anagrafica_id | livesearch | Base/clienti (inferred from field name) | format=livesearch; field name suggests customer; extra=default_val |
| Produzione/ordini | destinazione_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | task_id | task | Produzione/task | format=task; extra=default_val |
| Produzione/ordini | contratto_attivita_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | listino_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | ufficio_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | mod_pagamento | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | banca_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | conto_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | agente_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/ordini | segnalatore_mezzo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Produzione/task | cliente_id | livesearch | Base/clienti (inferred from field name) | format=livesearch; field name suggests customer; extra=default_val |
| Magazzino/movimento | sezionale | menu | Amministrazione/sezionali | format=menu; extra=default_val |
| Magazzino/movimento | cod | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | causale_id | menu | Magazzino/causali_magazzino or causali_trasporto | format=menu; extra=default_val |
| Magazzino/movimento | causale_interna_id | menu | Magazzino/causali_magazzino or causali_trasporto | format=menu; extra=default_val |
| Magazzino/movimento | mod_pagamento | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | causale_trasporto_id | menu | Magazzino/causali_magazzino or causali_trasporto | format=menu; extra=default_val |
| Magazzino/movimento | vettore_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | deposito_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | deposito_a | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | agente_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | provincia | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | zona_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/movimento | rif_inserito_da | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | tipo | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | cod_iva_id | menu | Base/iva | format=menu; extra=default_val |
| Magazzino/articoli | cod_iva_vendita_id | menu | Base/iva | format=menu; extra=default_val |
| Magazzino/articoli | famiglia_id | gerarchic | UNKNOWN | format=gerarchic; extra=default_val |
| Magazzino/articoli | produttore_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | unita_misura_id | menu | Base/unita_misura | format=menu; extra=default_val |
| Magazzino/articoli | conto_costo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | centro_costo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | centro_costo_spec | gerarchic | UNKNOWN | format=gerarchic; extra=default_val |
| Magazzino/articoli | conto_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | centro_ricavo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | tipo_val | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | ordinabile | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | in_inventario | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/articoli | producibile | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | tipo_c | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | cod | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | sezionale_id | menu | Amministrazione/sezionali | format=menu; extra=default_val |
| Magazzino/causali_magazzino | tipo | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | print_dc | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | causale_trasporto_id | menu | Magazzino/causali_magazzino or causali_trasporto | format=menu; extra=default_val |
| Magazzino/causali_magazzino | print_picking | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | lotti | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | matricole | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | prezzi | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | prezzi_pdf | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | modello_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | deposito_da | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | movimenta_pr | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | fabbisogno_pr | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | ordinata_pr | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | impegnata_pr | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | guasta_pr | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | deposito_a | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | movimenta_sec | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | fabbisogno_sec | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | ordinata_sec | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | impegnata_sec | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | guasta_sec | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | richiedi_autorizzazione_id | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/causali_magazzino | richiedi_autorizzazione_finanziaria_id | menu | UNKNOWN | format=menu; extra=default_val |
| Amministrazione/sezionali | conto_cassa_id | menu | UNKNOWN | format=menu; extra=default_val |
| Amministrazione/sezionali | conto_banca_id | menu | UNKNOWN | format=menu; extra=default_val |
| Amministrazione/sezionali | conto_ricavo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Amministrazione/sezionali | centro_ricavo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Amministrazione/sezionali | mod_pagamento_ids | menu | UNKNOWN | format=menu; extra=default_val |
| Base/iva | stato_id | menu | UNKNOWN | format=menu; extra=default_val |
| Base/iva | natura_iva | menu | Base/iva | format=menu; extra=default_val |
| Base/iva | flag_iva_n2 | menu | Base/iva | format=menu; extra=default_val |
| Base/iva | flag_iva_n3 | menu | Base/iva | format=menu; extra=default_val |
| Base/iva | flag_iva_n4 | menu | Base/iva | format=menu; extra=default_val |
| Base/iva | flag_iva_n6 | menu | Base/iva | format=menu; extra=default_val |
| Base/iva | flag_iva_n7 | menu | Base/iva | format=menu; extra=default_val |
| Base/modalita_pagamento | pagamento_tipo_id | menu | UNKNOWN | format=menu; extra=default_val |
| Base/modalita_pagamento | tipo_dec | menu | UNKNOWN | format=menu; extra=default_val |
| Base/modalita_pagamento | numero_rate | menu | UNKNOWN | format=menu; extra=default_val |
| Base/modalita_pagamento | tipo_rate | menu | UNKNOWN | format=menu; extra=default_val |
| Base/modalita_pagamento | incasso_tipo | menu | UNKNOWN | format=menu; extra=default_val |
| Base/modalita_pagamento | conto_id | menu | UNKNOWN | format=menu; extra=default_val |
| Base/vettori | provincia | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/listini | tipologia | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/listini | qta_tipo | menu | UNKNOWN | format=menu; extra=default_val |
| Magazzino/listini | eredita_da | menu | UNKNOWN | format=menu; extra=default_val |