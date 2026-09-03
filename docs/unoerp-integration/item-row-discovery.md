# Item row discovery

## Articolo

- PK: `id_articoli`
- Codice: `alpha_cod`
- Tipo: `tipo` menu (M/S/I/V per doc UnoERP)
- IVA vendita: `cod_iva_vendita_id` → Base/iva
- UoM: `unita_misura_id` → Base/unita_misura

## Righe documento

NOT_VERIFIED — tab `materiali` su ordini; FK riga presumibilmente `id_articoli` — REQUIRES show con righe

## Servizi / manodopera

- Servizio: articolo tipo S (PASS_CONDITIONED)
- Manodopera: tab `risorse_umane` su ordini — NOT_VERIFIED