-- OVERRIDE TEMPORANEO PILOT - DA RIMUOVERE IN PRODUZIONE
-- Pilot operatore impostazioni globali (solo flag DB).
-- Richiede anche NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1 nel deploy.
-- Eseguire solo su ambiente pilot/dev (es. `supabase db execute -f supabase/seeds/pilot_enable_operator_global_settings.sql`)

insert into public.app_settings (module, key, value, updated_by)
values ('system', 'enable_operator_global_settings', '{"enabled": true}'::jsonb, null)
on conflict (module, key) do update
  set value = excluded.value,
      updated_at = now();
