-- RLS attrezzature + Realtime + rbac_can_read_row / scope_cliente

-- ---------------------------------------------------------------------------
-- rbac_scope_cliente: attrezzature via mezzi.cliente
-- ---------------------------------------------------------------------------
create or replace function public.rbac_scope_cliente(p_table text, p_record_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref text;
begin
  if not public.rbac_is_cliente() then
    return true;
  end if;

  v_ref := public.rbac_cliente_ref();
  if v_ref is null or p_record_id is null then
    return false;
  end if;

  case p_table
    when 'mezzi' then
      return exists (
        select 1 from public.mezzi m
        where m.id = p_record_id and m.cliente = v_ref
      );
    when 'attrezzature' then
      return exists (
        select 1
        from public.attrezzature a
        join public.mezzi m on m.id = a.mezzo_id
        where a.id = p_record_id and m.cliente = v_ref
      );
    when 'lavorazioni' then
      return exists (
        select 1
        from public.lavorazioni l
        join public.mezzi m on m.id = l.mezzo_id
        where l.id = p_record_id and m.cliente = v_ref
      );
    when 'scheda_lavorazione' then
      return exists (
        select 1
        from public.scheda_lavorazione s
        join public.lavorazioni l on l.id = s.lavorazione_id
        join public.mezzi m on m.id = l.mezzo_id
        where s.id = p_record_id and m.cliente = v_ref
      );
    when 'preventivi' then
      return exists (
        select 1 from public.preventivi p
        where p.id = p_record_id and p.cliente = v_ref
      );
    else
      return false;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- rbac_can_read_row: attrezzature
-- ---------------------------------------------------------------------------
create or replace function public.rbac_can_read_row(p_resource text, p_row_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mezzo_id uuid;
  v_uid uuid;
  v_module text;
begin
  v_uid := public.rbac_auth_uid();

  if p_resource = 'profiles' then
    return public.rbac_has_capability(v_uid, 'can_manage_security')
      or p_row_id = v_uid;
  end if;

  v_module := public.rbac_resource_to_module(p_resource);

  if public.rbac_has_capability(v_uid, 'can_read_operational') then
    if p_resource = 'documenti' and public.rbac_is_cliente() then
      return false;
    end if;

    if v_module is not null and not public.user_effective_can(v_module, 'read') then
      return false;
    end if;

    if p_resource = 'lavorazioni' then
      select l.mezzo_id into v_mezzo_id from public.lavorazioni l where l.id = p_row_id limit 1;
      return public.rbac_scope_cliente_lavorazioni_mezzo(v_mezzo_id);
    end if;

    if p_resource in ('mezzi', 'attrezzature', 'scheda_lavorazione', 'preventivi') then
      return public.rbac_scope_cliente(p_resource, p_row_id);
    end if;

    if public.rbac_is_cliente() then
      return false;
    end if;

    return true;
  end if;

  if public.rbac_has_capability(v_uid, 'can_access_client_area') and public.rbac_is_cliente() then
    if p_resource = 'lavorazioni' then
      return public.rbac_scope_cliente('lavorazioni', p_row_id);
    end if;
    if p_resource = 'mezzi' then
      return public.rbac_scope_cliente('mezzi', p_row_id);
    end if;
    if p_resource = 'attrezzature' then
      return public.rbac_scope_cliente('attrezzature', p_row_id);
    end if;
    if p_resource = 'scheda_lavorazione' then
      return public.rbac_scope_cliente('scheda_lavorazione', p_row_id);
    end if;
    if p_resource = 'preventivi' then
      return public.rbac_scope_cliente('preventivi', p_row_id);
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.rbac_resource_to_module(p_resource text)
returns text
language sql
immutable
as $$
  select case coalesce(p_resource, '')
    when 'mezzi' then 'mezzi'
    when 'attrezzature' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'documenti' then 'documenti'
    when 'preventivi' then 'preventivi'
    when 'report' then 'report'
    when 'billing_customers' then 'fatturazione'
    when 'invoices' then 'fatturazione'
    when 'invoice_rows' then 'fatturazione'
    when 'invoice_links' then 'fatturazione'
    when 'invoice_payments' then 'fatturazione'
    when 'ddt_documents' then 'ddt'
    when 'ddt_rows' then 'ddt'
    when 'ddt_links' then 'ddt'
    when 'ordini_fornitori' then 'ordini_fornitori'
    when 'ordini_fornitori_righe' then 'ordini_fornitori'
    when 'ordini_fornitori_links' then 'ordini_fornitori'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Policies attrezzature (permessi modulo mezzi)
-- ---------------------------------------------------------------------------
alter table public.attrezzature enable row level security;

drop policy if exists cap_attrezzature_select on public.attrezzature;
create policy cap_attrezzature_select on public.attrezzature for select to authenticated
using (public.rbac_can_read_row('attrezzature', id));

drop policy if exists cap_attrezzature_insert on public.attrezzature;
create policy cap_attrezzature_insert on public.attrezzature for insert to authenticated
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_attrezzature_update on public.attrezzature;
create policy cap_attrezzature_update on public.attrezzature for update to authenticated
using (public.rbac_module_can('mezzi', 'write'))
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_attrezzature_delete on public.attrezzature;
create policy cap_attrezzature_delete on public.attrezzature for delete to authenticated
using (public.rbac_module_can('mezzi', 'admin'));

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.attrezzature;
exception
  when duplicate_object then null;
end $$;

-- Profilo officina (R2 UI) — default attrezzature
insert into public.app_settings (module, key, value)
values ('system', 'officina_profilo_operativo', '"attrezzature"'::jsonb)
on conflict (module, key) do nothing;
