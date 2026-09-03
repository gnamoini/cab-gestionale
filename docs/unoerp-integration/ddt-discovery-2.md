# DDT discovery 2

## Modulo documento

**OBSERVED:** DDT = `Magazzino/movimento` (non `Magazzino/ddt` che restituisce HTTP 500)

Tipo: documento/movimento magazzino con causale, sezionale, trasporto.

## Catena causale → sezionale → movimento

- `Magazzino/causali_magazzino.sezionale_id` → `Amministrazione/sezionali`
- `Magazzino/causali_magazzino.causale_trasporto_id` → `Magazzino/causali_trasporto`
- `Magazzino/movimento.causale_id` → causale movimento
- `Magazzino/movimento.sezionale` → sezionale documento

## Campi movimento (OBSERVED)

- `data` (data)
- `data_registrazione` (data)
- `doc_number_padded` (text)
- `doc_number` (text)
- `sezionale` (menu)
- `causale_id` (menu)
- `causale_interna_id` (menu)
- `clifor` (text)
- `causale_trasporto_id` (menu)
- `anagrafica_id` (text)
- `causale` (null)
- `clifor_id` (null)
- `tipo_causale` (null)

## Righe

NOT_VERIFIED — index/show movimento vuoti nel campione API

## Fatturazione downstream

NOT_VERIFIED — campo `to_cont` presente in schema; workflow non dimostrabile READ-ONLY