-- Porta le priorità lavorazioni dentro app_settings.
-- Nessuna modifica schema: la lista resta nel JSON `lavorazioni/prefs`.

insert into public.app_settings (module, key, value, updated_by)
values (
  'lavorazioni',
  'prefs',
  jsonb_build_object('prioritaDb', jsonb_build_array('bassa', 'media', 'alta', 'urgente')),
  null
)
on conflict (module, key) do update
set value = case
  when public.app_settings.value ? 'prioritaDb' then public.app_settings.value
  else jsonb_set(
    public.app_settings.value,
    '{prioritaDb}',
    jsonb_build_array('bassa', 'media', 'alta', 'urgente'),
    true
  )
end;
