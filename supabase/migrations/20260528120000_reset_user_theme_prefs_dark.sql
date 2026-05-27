-- Reset preferenza tema utenti al default globale dark.
-- Nuovi utenti senza riga user_prefs continuano a usare il default lato app.

update public.app_settings
set
  value = jsonb_set(
    coalesce(value, '{}'::jsonb),
    '{theme}',
    '"dark"'::jsonb,
    true
  ),
  updated_at = now()
where module = 'user_prefs'
  and (
    value is null
    or value->>'theme' is distinct from 'dark'
  );
