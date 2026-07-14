-- Fatturazione RBAC write — test DB (eseguire post-migration su DB locale/staging).
-- Uso: psql $DATABASE_URL -f lib/regression/fatturazione-rbac-write-e2e.sql
-- Oppure: supabase db execute --file lib/regression/fatturazione-rbac-write-e2e.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) Page access → module write (catena SSOT, senza JWT)
-- ---------------------------------------------------------------------------
do $$
declare
  v_manager_id uuid;
  v_cliente_id uuid;
  v_operatore_id uuid;
begin
  select p.id into v_manager_id
  from public.profiles p
  join public.roles r on r.id = p.ruolo
  where r.key = 'manager'
  limit 1;

  select p.id into v_cliente_id
  from public.profiles p
  join public.roles r on r.id = p.ruolo
  where r.key = 'cliente'
  limit 1;

  select p.id into v_operatore_id
  from public.profiles p
  join public.roles r on r.id = p.ruolo
  where r.key = 'operatore'
  limit 1;

  if v_manager_id is null then
    raise notice 'SKIP: nessun profilo manager — seed DB richiesto';
    return;
  end if;

  if not public.rbac_module_from_page_access(v_manager_id, 'fatturazione', 'write') then
    raise exception 'FAIL: manager deve avere fatturazione write via page SSOT';
  end if;

  if v_cliente_id is not null
     and public.rbac_module_from_page_access(v_cliente_id, 'fatturazione', 'write') then
    raise exception 'FAIL: cliente non deve avere fatturazione write';
  end if;

  if v_operatore_id is not null
     and public.rbac_module_from_page_access(v_operatore_id, 'fatturazione', 'write') then
    raise exception 'FAIL: operatore non deve avere fatturazione write';
  end if;

  raise notice 'OK: rbac_module_from_page_access manager/cliente/operatore';
end $$;

-- ---------------------------------------------------------------------------
-- 2) Policy alignment migration applicata
-- ---------------------------------------------------------------------------
do $$
declare
  v_pol text;
begin
  select pol.policies::text into v_pol
  from (
    select array_agg(policyname || ':' || cmd || ':' || coalesce(qual, '') || ':' || coalesce(with_check, '')) as policies
    from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'cap_invoices_delete'
  ) pol;

  if v_pol is null or v_pol not like '%write%' then
    raise exception 'FAIL: cap_invoices_delete non usa write — applicare 20260915120200_fatturazione_write_rls_alignment';
  end if;

  if v_pol not like '%da_verificare%' then
    raise exception 'FAIL: cap_invoices_delete deve includere da_verificare';
  end if;

  raise notice 'OK: cap_invoices_delete allineata';
end $$;

-- ---------------------------------------------------------------------------
-- 3) cancel_invoice — guard write esplicito nel body
-- ---------------------------------------------------------------------------
do $$
declare
  v_src text;
begin
  select pg_get_functiondef('public.cancel_invoice(uuid,text)'::regprocedure) into v_src;
  if v_src is null then
    raise exception 'FAIL: cancel_invoice non trovata';
  end if;
  if v_src not like '%rbac_module_can%fatturazione%write%' then
    raise exception 'FAIL: cancel_invoice senza guard write esplicito';
  end if;
  if position('rbac_module_can' in v_src) > position('invoice_apply_transition' in v_src) then
    raise exception 'FAIL: guard write deve precedere invoice_apply_transition';
  end if;
  raise notice 'OK: cancel_invoice guard + transition';
end $$;

rollback;
