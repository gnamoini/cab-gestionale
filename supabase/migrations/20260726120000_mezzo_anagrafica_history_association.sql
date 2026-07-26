-- Associazione mezzo: event_kind per rendering timeline + reason (motivazione opzionale).
ALTER TABLE public.mezzo_anagrafica_history
  ADD COLUMN IF NOT EXISTS event_kind text NOT NULL DEFAULT 'anagrafica_change'
    CHECK (event_kind IN ('anagrafica_change', 'association_change')),
  ADD COLUMN IF NOT EXISTS reason text;
