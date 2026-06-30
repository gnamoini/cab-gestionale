-- Fase E: espansione entità import plug-in registry.

alter table public.import_batches drop constraint if exists import_batches_entity_chk;
alter table public.import_batches add constraint import_batches_entity_chk check (
  entity in (
    'magazzino_ricambi',
    'clienti_anagrafica',
    'listino_ricambi',
    'mezzi',
    'preventivi',
    'settings_fornitori',
    'settings_produttori',
    'settings_categorie',
    'settings_marche',
    'settings_addetti',
    'settings_cantieri',
    'settings_utilizzatori',
    'settings_hierarchy_attrezzature',
    'settings_hierarchy_telai',
    'lavorazioni',
    'fatture_draft',
    'billing_customers',
    'documenti_metadata',
    'dipendenti_timesheet'
  )
);

alter table public.import_mapping_presets drop constraint if exists import_mapping_presets_entity_chk;
alter table public.import_mapping_presets add constraint import_mapping_presets_entity_chk check (
  entity in (
    'magazzino_ricambi',
    'clienti_anagrafica',
    'listino_ricambi',
    'mezzi',
    'preventivi',
    'settings_fornitori',
    'settings_produttori',
    'settings_categorie',
    'settings_marche',
    'settings_addetti',
    'settings_cantieri',
    'settings_utilizzatori',
    'settings_hierarchy_attrezzature',
    'settings_hierarchy_telai',
    'lavorazioni',
    'fatture_draft',
    'billing_customers',
    'documenti_metadata',
    'dipendenti_timesheet'
  )
);
