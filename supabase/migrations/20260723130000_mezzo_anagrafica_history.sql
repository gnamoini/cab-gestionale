-- Storia evolutiva anagrafica mezzo (complementare a log_modifiche).
CREATE TABLE IF NOT EXISTS public.mezzo_anagrafica_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mezzo_id uuid NOT NULL REFERENCES public.mezzi(id) ON DELETE CASCADE,
  lavorazione_id uuid REFERENCES public.lavorazioni(id) ON DELETE SET NULL,
  scheda_id uuid REFERENCES public.scheda_lavorazione(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  origine text NOT NULL CHECK (origine IN (
    'scheda_ingresso', 'modifica_manuale', 'import_ai', 'migrazione'
  )),
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mezzo_anagrafica_history_mezzo_created
  ON public.mezzo_anagrafica_history (mezzo_id, created_at DESC);

ALTER TABLE public.mezzo_anagrafica_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY cap_mezzo_anagrafica_history_select ON public.mezzo_anagrafica_history
  FOR SELECT USING (public.rbac_can_read_row('mezzi', mezzo_id));

CREATE POLICY cap_mezzo_anagrafica_history_insert ON public.mezzo_anagrafica_history
  FOR INSERT WITH CHECK (public.rbac_module_can('mezzi', 'write'));
