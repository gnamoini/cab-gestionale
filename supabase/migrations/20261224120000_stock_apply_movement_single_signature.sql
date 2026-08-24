-- stock_apply_movement: firma canonica unica (fix PGRST203 overload ambiguity)
-- La migration 20261219120000 ha aggiunto la firma 12-arg senza rimuovere la 9-arg.
-- PostgREST non riesce a risolvere la chiamata client con 9 named params.

begin;

drop function if exists public.stock_apply_movement(
  uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb
);

grant execute on function public.stock_apply_movement(
  uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb, uuid, uuid, text
) to authenticated;

commit;
