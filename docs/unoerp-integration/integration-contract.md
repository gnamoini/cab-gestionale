# Contratto di integrazione CAB ↔ UnoERP

Questo documento è immutabile rispetto ai requisiti di prodotto. Il codice non può reinterpretarlo.

```text
CAB è master operativo.

UnoERP è master amministrativo.

CAB crea/modifica:
- preventivi
- consuntivi
- DDT
- righe
- quantità
- prezzi
- sconti
- descrizioni
- dati operativi

UnoERP mantiene:
- anagrafiche amministrative
- dati fiscali
- dati bancari
- configurazioni
- sezionali
- altri campi amministrativi

CAB non cancella, annulla, archivia, disabilita o modifica lo stato
di documenti UnoERP non propri.

CAB non crea automaticamente:
- clienti
- articoli
- servizi
- aliquote IVA
```

## Filosofia

```text
FAIL SAFE > AUTOMATIC RECOVERY.

Quando l'integrazione non è certa:
  NON CREARE.
  NON AGGIORNARE.
  NON CANCELLARE.
  NON RIASSOCIARE.

Bloccare, registrare il motivo, lasciare il documento CAB disponibile.
```

## Trigger

Solo CREATE/UPDATE espliciti di un documento CAB. Nessuna sincronizzazione implicita da lettura UnoERP. Reconciliation sempre read-only.
