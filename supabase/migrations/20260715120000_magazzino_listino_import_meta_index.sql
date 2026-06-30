-- Indice parziale per bulk delete ricambi generati da import listino
CREATE INDEX IF NOT EXISTS idx_magazzino_ricambi_meta_listino_import
  ON public.magazzino_ricambi ((meta #>> '{listinoImport,generatoAutomaticamente}'))
  WHERE (meta #>> '{listinoImport,generatoAutomaticamente}') = 'true';

COMMENT ON INDEX idx_magazzino_ricambi_meta_listino_import IS
  'Filtra ricambi creati da import listino documenti (meta.listinoImport.generatoAutomaticamente).';
