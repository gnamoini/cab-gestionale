-- FASE 8 — Ciclo Attivo RPC: eligibility, emit accounting, SDI reject reversal, NC/ND guards.
begin;

-- ---------------------------------------------------------------------------
-- RBAC ops: emit / credit_note / payment / export map to page write; sdi_admin = admin only
-- ---------------------------------------------------------------------------
create or replace function public.rbac_module_from_page_access(p_user_id uuid, p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_page record;
  v_level text;
  v_role_key text;
begin
  if p_user_id is null or p_module is null or p_module = '' then
    return false;
  end if;

  v_role_key := lower(trim(public.rbac_role_for_user(p_user_id)));
  if v_role_key = 'admin' then
    return true;
  end if;

  if p_op = 'sdi_admin' then
    return false;
  end if;

  for v_page in
    select distinct e.page_key
    from public.rbac_page_module_expansion e
    where e.module = p_module
  loop
    v_level := public.rbac_user_page_access_level(p_user_id, v_page.page_key);
    if v_level = 'none' then
      continue;
    end if;
    if p_op = 'read' and v_level in ('read', 'write') then
      return true;
    end if;
    if p_op in ('write', 'emit', 'credit_note', 'payment', 'export') and v_level = 'write' then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Numbering: nota_debito
-- ---------------------------------------------------------------------------
create or replace function public.format_document_number(
  p_document_type text,
  p_fiscal_year integer,
  p_series text,
  p_number integer
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_series text := public.normalize_document_series(p_series);
  v_padded text := lpad(p_number::text, 3, '0');
begin
  if p_number is null or p_number <= 0 then
    return 'Bozza';
  end if;

  case p_document_type
    when 'fattura' then
      return 'FT ' || p_fiscal_year::text || '/' || v_padded;
    when 'nota_credito' then
      return 'NC ' || p_fiscal_year::text || '/' || v_padded;
    when 'nota_debito' then
      return 'ND ' || p_fiscal_year::text || '/' || v_padded;
    when 'ddt' then
      if v_series = 'DEFAULT' then
        return 'DDT ' || p_fiscal_year::text || '/' || v_padded;
      end if;
      return 'DDT ' || v_series || '/' || p_fiscal_year::text || '/' || v_padded;
    else
      raise exception 'Tipo documento non supportato per format_document_number: %', p_document_type;
  end case;
end;
$$;

create or replace function public.allocate_document_number(
  p_document_type text,
  p_fiscal_year integer,
  p_series text default 'DEFAULT',
  p_company_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := coalesce(
    p_company_id,
    public.rbac_user_company_id(),
    '00000000-0000-4000-8000-000000000001'::uuid
  );
  v_series text := public.normalize_document_series(p_series);
  v_row record;
  v_next integer;
begin
  if p_document_type not in ('fattura', 'nota_credito', 'nota_debito', 'ddt') then
    raise exception 'Tipo documento numerazione non valido: %', p_document_type;
  end if;
  if p_fiscal_year < 2000 or p_fiscal_year > 2100 then
    raise exception 'Anno fiscale non valido: %', p_fiscal_year;
  end if;
  if v_series !~ '^[A-Z0-9_-]{1,16}$' then
    raise exception 'Serie documento non valida: %', v_series;
  end if;

  insert into public.document_number_sequences (company_id, document_type, fiscal_year, series, current_number)
  values (v_company, p_document_type, p_fiscal_year, v_series, 0)
  on conflict (company_id, document_type, fiscal_year, series) do nothing;

  select * into v_row
  from public.document_number_sequences
  where company_id = v_company
    and document_type = p_document_type
    and fiscal_year = p_fiscal_year
    and series = v_series
  for update;

  v_next := v_row.current_number + 1;
  update public.document_number_sequences
  set current_number = v_next, updated_at = now()
  where id = v_row.id;

  return v_next;
end;
$$;

revoke all on function public.allocate_document_number(text, integer, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Allocation remaining — consume only pending/validly_issued
-- ---------------------------------------------------------------------------
create or replace function public.invoice_source_allocated_total(
  p_source_type text,
  p_source_id uuid,
  p_exclude_invoice_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(il.allocated_totale), 0)::numeric
  from public.invoice_links il
  join public.invoices i on i.id = il.invoice_id
  where il.source_type = p_source_type
    and il.source_id = p_source_id
    and i.status <> 'annullata'
    and coalesce(i.fiscal_validity, 'not_applicable') in ('pending', 'validly_issued', 'not_applicable')
    and coalesce(i.document_status, i.status) not in ('annullata')
    and (p_exclude_invoice_id is null or i.id <> p_exclude_invoice_id)
    and not (coalesce(i.fiscal_validity, '') = 'not_validly_issued');
$$;

create or replace function public.assert_invoice_source_allocations(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_cap numeric;
  v_allocated numeric;
begin
  for r in
    select source_type, source_id, sum(allocated_totale)::numeric as allocated_totale
    from public.invoice_links
    where invoice_id = p_invoice_id
      and source_type in ('preventivo', 'consuntivo', 'lavorazione', 'ddt')
    group by source_type, source_id
  loop
    v_cap := null;
    if r.source_type in ('preventivo', 'consuntivo') then
      select p.totale into v_cap from public.preventivi p where p.id = r.source_id;
    elsif r.source_type = 'ddt' then
      select coalesce((
        select sum(dr.quantita)
        from public.ddt_rows dr
        where dr.ddt_id = r.source_id
      ), 0) into v_cap;
      -- ponytail: DDT cap is monetary via allocated_totale already asserted vs preventivo if linked
      if v_cap is null then v_cap := r.allocated_totale; end if;
    elsif r.source_type = 'lavorazione' then
      v_cap := r.allocated_totale + public.invoice_source_allocated_total('lavorazione', r.source_id, p_invoice_id);
    end if;

    if r.source_type in ('preventivo', 'consuntivo') then
      if v_cap is null then
        raise exception 'SOURCE_NOT_FOUND';
      end if;
      v_allocated := public.invoice_source_allocated_total(r.source_type, r.source_id, p_invoice_id) + r.allocated_totale;
      if round(v_allocated, 2) > round(v_cap, 2) then
        raise exception 'SOURCE_ALREADY_BILLED';
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Eligibility (server SSOT)
-- ---------------------------------------------------------------------------
create or replace function public.billing_eligibility(p_source_type text, p_source_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_remaining numeric := 0;
  v_total numeric := 0;
  v_allocated numeric := 0;
  v_ok boolean := false;
  v_reason text := 'NOT_BILLABLE';
  v_td text := 'TD01';
  v_label text := '';
  v_customer uuid;
  v_stato text;
  v_tipo text;
begin
  if not public.rbac_module_can('fatturazione', 'read') then
    raise exception 'Permesso negato';
  end if;

  if p_source_type in ('preventivo', 'consuntivo') then
    select p.totale, p.cliente,
           coalesce(p.dettagli->>'statoCliente', case when p.stato_workflow = 'acquisito' then 'accettato' else p.stato_workflow end),
           coalesce(p.dettagli->>'tipoDocumento', 'preventivo')
    into v_total, v_label, v_stato, v_tipo
    from public.preventivi p
    where p.id = p_source_id;
    if not found then
      return jsonb_build_object('eligible', false, 'reason', 'SOURCE_NOT_FOUND', 'remaining', 0);
    end if;
    if p_source_type = 'preventivo' and v_tipo = 'consuntivo' then
      return jsonb_build_object('eligible', false, 'reason', 'USE_CONSUNTIVO', 'remaining', 0);
    end if;
    if p_source_type = 'consuntivo' and v_tipo is distinct from 'consuntivo' then
      return jsonb_build_object('eligible', false, 'reason', 'NOT_CONSUNTIVO', 'remaining', 0);
    end if;
    if p_source_type = 'preventivo' and coalesce(v_stato, '') is distinct from 'accettato' then
      return jsonb_build_object('eligible', false, 'reason', 'PREVENTIVO_NOT_ACCEPTED', 'remaining', 0, 'stato_cliente', v_stato);
    end if;
    v_allocated := public.invoice_source_allocated_total(
      case when v_tipo = 'consuntivo' then 'consuntivo' else 'preventivo' end,
      p_source_id,
      null
    );
    v_remaining := round(greatest(coalesce(v_total, 0) - v_allocated, 0), 2);
    v_ok := v_remaining > 0;
    v_reason := case when v_ok then 'OK' else 'SOURCE_ALREADY_FULLY_BILLED' end;
  elsif p_source_type = 'ddt' then
    select d.status into v_stato
    from public.ddt_documents d where d.id = p_source_id;
    if not found then
      return jsonb_build_object('eligible', false, 'reason', 'SOURCE_NOT_FOUND', 'remaining', 0);
    end if;
    if v_stato in ('bozza', 'annullato') then
      return jsonb_build_object('eligible', false, 'reason', 'DDT_NOT_CONFIRMED', 'remaining', 0);
    end if;
    v_allocated := public.invoice_source_allocated_total('ddt', p_source_id, null);
    v_ok := v_allocated = 0;
    v_remaining := case when v_ok then 1 else 0 end;
    v_reason := case when v_ok then 'OK' else 'SOURCE_ALREADY_BILLED' end;
    v_td := 'TD24';
  elsif p_source_type = 'lavorazione' then
    if exists (
      select 1 from public.preventivi p
      where p.lavorazione_id = p_source_id
        and coalesce(p.dettagli->>'tipoDocumento', 'preventivo') = 'consuntivo'
    ) then
      return jsonb_build_object('eligible', false, 'reason', 'USE_CONSUNTIVO', 'remaining', 0);
    end if;
    v_allocated := public.invoice_source_allocated_total('lavorazione', p_source_id, null);
    v_ok := v_allocated = 0;
    v_remaining := case when v_ok then 1 else 0 end;
    v_reason := case when v_ok then 'OK' else 'SOURCE_ALREADY_BILLED' end;
  else
    return jsonb_build_object('eligible', false, 'reason', 'SOURCE_TYPE_UNSUPPORTED', 'remaining', 0);
  end if;

  return jsonb_build_object(
    'eligible', v_ok,
    'reason', v_reason,
    'remaining', v_remaining,
    'source_type', p_source_type,
    'source_id', p_source_id,
    'recommended_document_type', v_td
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- invoice_write_status_axes — also fiscal_validity + accounting_status
-- ---------------------------------------------------------------------------
drop function if exists public.invoice_write_status_axes(uuid, text, text, text, uuid, uuid, boolean, uuid, text);

create or replace function public.invoice_write_status_axes(
  p_invoice_id uuid,
  p_document_status text,
  p_payment_status text,
  p_sdi_status text,
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_emit_event boolean default true,
  p_actor_id uuid default null,
  p_transition text default null,
  p_fiscal_validity text default null,
  p_accounting_status text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_actor_id, public.rbac_auth_uid());
  v_old record;
  v_corr uuid := coalesce(p_correlation_id, gen_random_uuid());
  v_event_id uuid;
  v_fv text;
  v_acc text;
begin
  select document_status, payment_status, sdi_status, fiscal_validity, accounting_status
  into v_old
  from public.invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fattura non trovata';
  end if;

  v_fv := coalesce(p_fiscal_validity, v_old.fiscal_validity);
  v_acc := coalesce(p_accounting_status, v_old.accounting_status);

  if v_old.document_status is not distinct from p_document_status
     and v_old.payment_status is not distinct from p_payment_status
     and v_old.sdi_status is not distinct from p_sdi_status
     and v_old.fiscal_validity is not distinct from v_fv
     and v_old.accounting_status is not distinct from v_acc
  then
    return null;
  end if;

  perform set_config('invoice.axes_write_ssot', 'true', true);

  update public.invoices
  set document_status = p_document_status,
      payment_status = p_payment_status,
      sdi_status = p_sdi_status,
      fiscal_validity = v_fv,
      accounting_status = v_acc,
      updated_by = v_uid,
      version = version + 1
  where id = p_invoice_id;

  perform set_config('invoice.axes_write_ssot', 'false', true);

  if not p_emit_event then
    return null;
  end if;

  v_event_id := public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'document', 'status_changed', v_corr, p_causation_id,
    jsonb_build_object(
      'transition', coalesce(p_transition, 'axes_write'),
      'document_status', p_document_status,
      'payment_status', p_payment_status,
      'sdi_status', p_sdi_status,
      'fiscal_validity', v_fv,
      'accounting_status', v_acc
    ),
    v_uid
  );
  return v_event_id;
end;
$$;

revoke all on function public.invoice_write_status_axes(uuid, text, text, text, uuid, uuid, boolean, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.invoice_write_status_axes(uuid, text, text, text, uuid, uuid, boolean, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Emission snapshot builder
-- ---------------------------------------------------------------------------
create or replace function public.invoice_build_emission_snapshot(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_profile record;
  v_rows jsonb;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  if not found then raise exception 'Fattura non trovata'; end if;

  select * into v_profile
  from public.company_fiscal_profile
  where company_id = v_inv.company_id and active
  limit 1;

  if not found then
    raise exception 'COMPANY_FISCAL_PROFILE_MISSING';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'descrizione', r.descrizione,
    'quantita', r.quantita,
    'prezzo_unitario', r.prezzo_unitario,
    'sconto_percent', r.sconto_percent,
    'imponibile', r.imponibile,
    'iva', r.iva,
    'totale', r.totale,
    'vat_code', r.vat_code,
    'vat_rate', r.vat_rate,
    'vat_nature', r.vat_nature,
    'source_type', r.source_type,
    'source_id', r.source_id,
    'source_row_id', r.source_row_id
  ) order by r.created_at), '[]'::jsonb)
  into v_rows
  from public.invoice_rows r
  where r.invoice_id = p_invoice_id;

  return jsonb_build_object(
    'cedente', jsonb_build_object(
      'ragione_sociale', v_profile.ragione_sociale,
      'partita_iva', v_profile.partita_iva,
      'codice_fiscale', v_profile.codice_fiscale,
      'indirizzo', v_profile.indirizzo,
      'cap', v_profile.cap,
      'comune', v_profile.comune,
      'provincia', v_profile.provincia,
      'nazione', v_profile.nazione,
      'pec', v_profile.pec,
      'codice_destinatario', v_profile.codice_destinatario,
      'regime_fiscale', v_profile.regime_fiscale
    ),
    'cliente', coalesce(v_inv.customer_snapshot, '{}'::jsonb),
    'documento', jsonb_build_object(
      'id', v_inv.id,
      'tipo_documento', coalesce(v_inv.fattura_pa_tipo_documento, 'TD01'),
      'document_type', v_inv.document_type,
      'numero', v_inv.numero,
      'serie', v_inv.series,
      'anno', v_inv.anno,
      'data_emissione', v_inv.data_emissione,
      'data_effettuazione', coalesce(v_inv.data_effettuazione, v_inv.data_emissione),
      'data_scadenza', v_inv.data_scadenza,
      'currency', 'EUR'
    ),
    'righe', v_rows,
    'totali', jsonb_build_object(
      'imponibile', v_inv.imponibile,
      'iva', v_inv.iva,
      'totale', v_inv.totale
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment schedule from payment_terms
-- ---------------------------------------------------------------------------
create or replace function public.invoice_create_payment_schedule(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_term record;
  v_sched jsonb;
  v_el jsonb;
  v_idx integer := 0;
  v_n integer;
  v_amount numeric;
  v_sum numeric := 0;
  v_due date;
  v_days integer;
  v_pct numeric;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  if v_inv.totale <= 0 then
    return;
  end if;

  delete from public.customer_open_items where invoice_id = p_invoice_id and status <> 'cancelled';

  if v_inv.payment_term_id is not null then
    select * into v_term from public.payment_terms where id = v_inv.payment_term_id;
  end if;

  v_sched := coalesce(v_term.split_schedule, '[]'::jsonb);
  if jsonb_typeof(v_sched) = 'array' and jsonb_array_length(v_sched) > 0 then
    v_n := jsonb_array_length(v_sched);
    for v_el in select * from jsonb_array_elements(v_sched)
    loop
      v_idx := v_idx + 1;
      v_days := coalesce((v_el->>'days')::integer, v_term.days, 0);
      v_pct := coalesce((v_el->>'percent')::numeric, round(100.0 / v_n, 4));
      if v_idx = v_n then
        v_amount := round(v_inv.totale - v_sum, 2);
      else
        v_amount := round(v_inv.totale * v_pct / 100.0, 2);
        v_sum := v_sum + v_amount;
      end if;
      v_due := v_inv.data_emissione + (v_days || ' days')::interval;
      if coalesce(v_term.end_of_month, false) then
        v_due := (date_trunc('month', v_due) + interval '1 month - 1 day')::date;
      end if;
      insert into public.customer_open_items (
        customer_id, source_type, source_id, invoice_id, document_number,
        amount_signed, remaining_signed, due_date, status, opened_at
      ) values (
        v_inv.customer_id, 'invoice', p_invoice_id, p_invoice_id,
        public.format_document_number(coalesce(v_inv.document_type, 'fattura'), v_inv.anno, v_inv.series, v_inv.numero),
        -v_amount, -v_amount, v_due, 'open', coalesce(v_inv.data_emissione::timestamptz, now())
      );
    end loop;
  else
    v_days := coalesce(v_term.days, 0);
    v_due := coalesce(v_inv.data_scadenza, v_inv.data_emissione + (v_days || ' days')::interval);
    if v_term.end_of_month then
      v_due := (date_trunc('month', v_due) + interval '1 month - 1 day')::date;
    end if;
    insert into public.customer_open_items (
      customer_id, source_type, source_id, invoice_id, document_number,
      amount_signed, remaining_signed, due_date, status, opened_at
    ) values (
      v_inv.customer_id, 'invoice', p_invoice_id, p_invoice_id,
      public.format_document_number(coalesce(v_inv.document_type, 'fattura'), v_inv.anno, v_inv.series, v_inv.numero),
      -v_inv.totale, -v_inv.residuo, v_due, 'open', coalesce(v_inv.data_emissione::timestamptz, now())
    );
    update public.invoices set data_scadenza = v_due where id = p_invoice_id and data_scadenza is null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounting post on emit (calls FASE 3 engine)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_post_accounting_on_emit(p_invoice_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_profile record;
  v_vat_account uuid;
  v_iva numeric;
  v_payload jsonb;
  v_result jsonb;
  v_entry_id uuid;
  v_tx integer;
  v_key text;
  v_lines jsonb;
  v_cliente_acc uuid;
  v_ricavo_acc uuid;
  v_journal uuid;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  select * into v_profile from public.company_fiscal_profile
  where company_id = v_inv.company_id and active limit 1;

  if v_profile.sales_journal_id is null
     or v_profile.customer_receivable_account_id is null
     or v_profile.sales_revenue_account_id is null then
    raise exception 'ACCOUNTING_CONFIGURATION_INVALID';
  end if;

  v_journal := v_profile.sales_journal_id;
  v_cliente_acc := coalesce(
    (select default_account_id from public.clienti_anagrafiche where id = v_inv.customer_id),
    v_profile.customer_receivable_account_id
  );
  v_ricavo_acc := v_profile.sales_revenue_account_id;
  v_tx := greatest(coalesce(v_inv.fiscal_transmission_attempt, 0), 1);
  v_key := 'invoice-emit:' || p_invoice_id::text || ':tx:' || v_tx::text;

  select id into v_entry_id
  from public.accounting_entries
  where company_id = v_inv.company_id and idempotency_key = v_key
  limit 1;
  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select coalesce(sum(iva), 0), max(vat_account_id)
  into v_iva, v_vat_account
  from public.invoice_rows
  where invoice_id = p_invoice_id;

  if v_vat_account is null then
    select id into v_vat_account
    from public.accounting_accounts
    where company_id = v_inv.company_id and code = '2601'
    limit 1;
  end if;

  v_lines := jsonb_build_array(
    jsonb_build_object(
      'account_id', v_cliente_acc,
      'debit', v_inv.totale,
      'credit', 0,
      'description', 'Cliente'
    ),
    jsonb_build_object(
      'account_id', v_ricavo_acc,
      'debit', 0,
      'credit', v_inv.imponibile,
      'description', 'Ricavo'
    )
  );
  if v_iva > 0 and v_vat_account is not null then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'account_id', v_vat_account,
      'debit', 0,
      'credit', v_iva,
      'description', 'IVA'
    ));
  end if;

  v_payload := jsonb_build_object(
    'journal_id', v_journal,
    'competence_date', v_inv.data_emissione,
    'registration_date', v_inv.data_emissione,
    'description', 'Fattura ' || public.format_document_number(
      coalesce(v_inv.document_type, 'fattura'), v_inv.anno, v_inv.series, v_inv.numero
    ),
    'source_type', 'invoice',
    'source_id', p_invoice_id,
    'invoice_id', p_invoice_id,
    'entry_origin', 'automatic',
    'idempotency_key', v_key,
    'lines', v_lines
  );

  v_result := public.accounting_create_entry(v_payload);
  v_entry_id := (v_result->>'id')::uuid;
  perform public.accounting_post_entry(v_entry_id, v_key);

  insert into public.receivables (
    company_id, entry_id, entry_line_id, customer_id, operational_open_item_id,
    payment_term_id, due_date, amount, residual, status
  )
  select
    v_inv.company_id,
    v_entry_id,
    l.id,
    v_inv.customer_id,
    oi.id,
    v_inv.payment_term_id,
    coalesce(oi.due_date, v_inv.data_scadenza, v_inv.data_emissione),
    abs(oi.amount_signed),
    abs(oi.remaining_signed),
    'open'
  from public.accounting_entry_lines l
  join public.customer_open_items oi on oi.invoice_id = p_invoice_id and oi.status = 'open'
  where l.entry_id = v_entry_id and l.account_id = v_cliente_acc
  limit 1;

  return v_entry_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enqueue SDI job
-- ---------------------------------------------------------------------------
create or replace function public.invoice_enqueue_sdi_job(p_invoice_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_job_id uuid;
  v_tx integer;
  v_key text;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  v_tx := greatest(coalesce(v_inv.fiscal_transmission_attempt, 1), 1);
  v_key := 'sdi-submit:' || p_invoice_id::text || ':tx:' || v_tx::text;

  insert into public.invoice_sdi_jobs (
    company_id, invoice_id, status, idempotency_key, correlation_key, provider
  ) values (
    v_inv.company_id, p_invoice_id, 'PENDING', v_key, v_key, 'simulator'
  )
  on conflict (idempotency_key) do update
    set status = case when public.invoice_sdi_jobs.status in ('SYNCED', 'BLOCKED') then public.invoice_sdi_jobs.status else 'PENDING' end,
        next_attempt_at = now()
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- emit transition (atomic)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_apply_transition(
  p_invoice_id uuid,
  p_transition text,
  p_payload jsonb default '{}'::jsonb,
  p_actor_id uuid default null,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_actor_id, public.rbac_auth_uid());
  v_inv record;
  v_corr uuid := gen_random_uuid();
  v_prev_event uuid;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_reason text;
  v_numero integer;
  v_validation jsonb;
  v_snapshot jsonb;
  v_entry uuid;
  v_tx integer;
  v_fv text;
  v_acc text;
begin
  if p_transition = 'emit' then
    if not public.rbac_module_can('fatturazione', 'emit') then
      raise exception 'Permesso negato';
    end if;
  elsif not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Fattura non trovata';
  end if;

  if p_expected_version is not null and v_inv.version is distinct from p_expected_version then
    raise exception 'invoice_version_conflict';
  end if;

  v_doc := coalesce(v_inv.document_status, (select m.new_document_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_pay := coalesce(v_inv.payment_status, (select m.new_payment_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_sdi := coalesce(v_inv.sdi_status, (select m.new_sdi_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_fv := coalesce(v_inv.fiscal_validity, 'not_applicable');
  v_acc := coalesce(v_inv.accounting_status, 'non_rilevante');

  case p_transition
    when 'submit_for_review' then
      if v_doc not in ('bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'da_verificare';
    when 'approve' then
      if v_doc not in ('da_verificare', 'bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'approvata';
      update public.invoices set approved_at = now(), approved_by = v_uid where id = p_invoice_id;
    when 'emit' then
      if v_doc in ('annullata') then
        raise exception 'Transizione non consentita';
      end if;
      if v_doc = 'emessa' and v_fv = 'validly_issued' then
        raise exception 'Transizione non consentita';
      end if;
      if v_doc = 'emessa' and v_fv = 'pending' then
        -- idempotent re-emit while waiting SdI
        return;
      end if;
      if not exists (
        select 1 from public.company_fiscal_profile p
        where p.company_id = v_inv.company_id and p.active
          and char_length(trim(p.ragione_sociale)) > 0
      ) then
        raise exception 'COMPANY_FISCAL_PROFILE_MISSING';
      end if;
      begin
        perform public.accounting_assert_period_open_for_posting(v_inv.company_id, v_inv.data_emissione);
      exception when others then
        raise exception 'ACCOUNTING_PERIOD_CLOSED: %', sqlerrm;
      end;
      v_tx := coalesce(v_inv.fiscal_transmission_attempt, 0) + 1;
      if v_inv.numero is not null and v_fv = 'not_validly_issued' then
        -- retry after SDI reject: keep emission snapshot/number; re-post ledger tx:n+1
        update public.invoices
        set fiscal_transmission_attempt = v_tx, updated_by = v_uid
        where id = p_invoice_id;
        perform public.invoice_create_payment_schedule(p_invoice_id);
        v_entry := public.invoice_post_accounting_on_emit(p_invoice_id);
        perform public.invoice_enqueue_sdi_job(p_invoice_id);
        v_doc := 'emessa';
        v_pay := coalesce(nullif(v_pay, ''), 'non_pagata');
        v_sdi := 'da_generare';
        v_fv := 'pending';
        v_acc := 'registrata';
      else
      v_validation := public.vat_validate_document(p_invoice_id, '{}'::jsonb);
      if not coalesce((v_validation->>'ok')::boolean, false) then
        raise exception 'VAT_CONFIGURATION_INVALID: %', v_validation->'errors';
      end if;
      perform public.vat_consolidate_invoice_rows(p_invoice_id);
      select * into v_inv from public.invoices where id = p_invoice_id;
      if v_inv.numero is null then
        v_numero := public.allocate_document_number(
          case
            when v_inv.document_type = 'nota_credito' then 'nota_credito'
            when v_inv.document_type = 'nota_debito' then 'nota_debito'
            else 'fattura'
          end,
          v_inv.anno,
          v_inv.series,
          v_inv.company_id
        );
        update public.invoices
        set numero = v_numero, updated_by = v_uid, fiscal_transmission_attempt = v_tx
        where id = p_invoice_id;
        v_inv.numero := v_numero;
      else
        update public.invoices
        set fiscal_transmission_attempt = v_tx, updated_by = v_uid
        where id = p_invoice_id;
      end if;
      select * into v_inv from public.invoices where id = p_invoice_id;
      v_snapshot := public.invoice_build_emission_snapshot(p_invoice_id);
      update public.invoices
      set invoice_snapshot = v_snapshot,
          data_effettuazione = coalesce(data_effettuazione, data_emissione),
          updated_by = v_uid
      where id = p_invoice_id;
      perform public.invoice_create_payment_schedule(p_invoice_id);
      v_entry := public.invoice_post_accounting_on_emit(p_invoice_id);
      perform public.invoice_enqueue_sdi_job(p_invoice_id);
      perform public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'document', 'invoice_finalized', v_corr, null,
        jsonb_build_object('entry_id', v_entry, 'tx', v_tx), v_uid
      );
      perform public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'accounting', 'accounting_entry_created', v_corr, null,
        jsonb_build_object('entry_id', v_entry), v_uid
      );
      perform public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'document', 'payment_schedule_created', v_corr, null,
        '{}'::jsonb, v_uid
      );
      v_doc := 'emessa';
      v_pay := coalesce(nullif(v_pay, ''), 'non_pagata');
      v_sdi := case when v_sdi in ('non_applicabile', 'scartata') or v_sdi is null then 'da_generare' else v_sdi end;
      v_fv := 'pending';
      v_acc := 'registrata';
      end if;
    when 'mark_sent_to_customer' then
      update public.invoices
      set sent_to_customer_at = coalesce(sent_to_customer_at, now()),
          updated_by = v_uid,
          version = version + 1
      where id = p_invoice_id;
      v_prev_event := public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'document', 'customer_sent', v_corr, null,
        jsonb_build_object('transition', p_transition), v_uid
      );
      return;
    when 'cancel' then
      if v_doc = 'annullata' then raise exception 'Fattura già annullata'; end if;
      v_doc := 'annullata';
      v_reason := nullif(p_payload->>'reason', '');
      update public.invoices
      set annullata_at = now(),
          admin_notes = trim(coalesce(admin_notes || E'\n', '') || coalesce(v_reason, '')),
          updated_by = v_uid
      where id = p_invoice_id;
      update public.customer_open_items
      set remaining_signed = 0, status = 'cancelled', closed_at = now(), updated_at = now()
      where invoice_id = p_invoice_id and status <> 'cancelled';
    when 'mark_overdue' then
      if v_doc <> 'emessa' then raise exception 'Transizione non consentita'; end if;
      if v_fv is distinct from 'validly_issued' then
        raise exception 'FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED';
      end if;
      v_pay := 'scaduta';
    else
      raise exception 'Transizione sconosciuta: %', p_transition;
  end case;

  v_prev_event := public.invoice_write_status_axes(
    p_invoice_id, v_doc, v_pay, v_sdi, v_corr, null, true, v_uid, p_transition, v_fv, v_acc
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- P0 SDI_REJECTED — technical reversal, not NC
-- ---------------------------------------------------------------------------
create or replace function public.handle_sdi_rejected(p_invoice_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_entry record;
  v_rev jsonb;
  v_tx integer;
  v_key text;
  v_service boolean;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if not v_service and not (
    public.rbac_module_can('fatturazione', 'sdi_admin')
    or public.rbac_module_can('fatturazione', 'write')
  ) then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;

  if v_inv.fiscal_validity = 'not_validly_issued' and v_inv.accounting_status = 'stornata' then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  v_tx := greatest(coalesce(v_inv.fiscal_transmission_attempt, 1), 1);
  v_key := 'invoice-emit-reverse:' || p_invoice_id::text || ':tx:' || v_tx::text;

  select * into v_entry
  from public.accounting_entries
  where invoice_id = p_invoice_id
    and status = 'posted'
    and coalesce(entry_origin, '') <> 'reversed'
  order by created_at desc
  limit 1;

  if found then
    v_rev := public.accounting_reverse_entry(v_entry.id, coalesce(p_reason, 'SDI_REJECTED'), v_key);
  end if;

  update public.customer_open_items
  set remaining_signed = 0, status = 'cancelled', closed_at = now(), updated_at = now()
  where invoice_id = p_invoice_id and status <> 'cancelled';

  update public.receivables
  set residual = 0, status = 'cancelled', updated_at = now()
  where operational_open_item_id in (
    select id from public.customer_open_items where invoice_id = p_invoice_id
  );

  perform public.invoice_write_status_axes(
    p_invoice_id,
    coalesce(v_inv.document_status, 'emessa'),
    coalesce(v_inv.payment_status, 'non_pagata'),
    'scartata',
    gen_random_uuid(),
    null,
    true,
    public.rbac_auth_uid(),
    'sdi_rejected',
    'not_validly_issued',
    'stornata'
  );

  perform public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'sdi', 'invoice_sdi_rejected', gen_random_uuid(), null,
    jsonb_build_object('reason', p_reason, 'tx', v_tx, 'reversal', v_rev),
    public.rbac_auth_uid()
  );
  perform public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'accounting', 'accounting_reversed', gen_random_uuid(), null,
    jsonb_build_object('reason', p_reason, 'tx', v_tx, 'reversal', v_rev),
    public.rbac_auth_uid()
  );
  perform public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'accounting', 'open_items_neutralized', gen_random_uuid(), null,
    jsonb_build_object('reason', p_reason, 'tx', v_tx),
    public.rbac_auth_uid()
  );

  return jsonb_build_object('ok', true, 'reversal', v_rev);
end;
$$;

create or replace function public.handle_sdi_outcome(
  p_invoice_id uuid,
  p_outcome text,
  p_provider_reference text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_sdi text;
  v_fv text;
  v_service boolean;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if not v_service and not (
    public.rbac_module_can('fatturazione', 'sdi_admin')
    or public.rbac_module_can('fatturazione', 'write')
  ) then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;

  if p_outcome = 'REJECTED' then
    return public.handle_sdi_rejected(p_invoice_id, p_reason);
  end if;

  v_sdi := case p_outcome
    when 'ACCEPTED' then 'accettata'
    when 'DELIVERED' then 'consegnata'
    when 'DELIVERY_FAILED' then 'impossibilita_consegna'
    when 'SUBMITTED' then 'inviata'
    else v_inv.sdi_status
  end;
  v_fv := case
    when p_outcome in ('ACCEPTED', 'DELIVERED', 'DELIVERY_FAILED') then 'validly_issued'
    else coalesce(v_inv.fiscal_validity, 'pending')
  end;

  if v_sdi is not distinct from v_inv.sdi_status
     and v_fv is not distinct from v_inv.fiscal_validity then
    return jsonb_build_object('ok', true, 'idempotent', true, 'sdi_status', v_sdi, 'fiscal_validity', v_fv);
  end if;

  perform public.invoice_write_status_axes(
    p_invoice_id,
    coalesce(v_inv.document_status, 'emessa'),
    coalesce(v_inv.payment_status, 'non_pagata'),
    v_sdi,
    gen_random_uuid(),
    null,
    true,
    public.rbac_auth_uid(),
    'sdi_' || lower(p_outcome),
    v_fv,
    v_inv.accounting_status
  );

  perform public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'sdi', 'invoice_sdi_' || lower(p_outcome), gen_random_uuid(), null,
    jsonb_build_object('provider_reference', p_provider_reference, 'reason', p_reason),
    public.rbac_auth_uid()
  );

  return jsonb_build_object('ok', true, 'sdi_status', v_sdi, 'fiscal_validity', v_fv);
end;
$$;

-- ---------------------------------------------------------------------------
-- NC: only validly_issued
-- ---------------------------------------------------------------------------
create or replace function public.create_credit_note_from_invoice(
  p_invoice_id uuid,
  p_amount numeric default null,
  p_reason text default null,
  p_rows jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src record;
  v_nc_id uuid;
begin
  if not public.rbac_module_can('fatturazione', 'credit_note') then
    raise exception 'Permesso negato';
  end if;

  select * into v_src from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if coalesce(v_src.fiscal_validity, '') is distinct from 'validly_issued' then
    raise exception 'FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED';
  end if;

  -- Delegate to previous 4-arg body via nested recreate: call inner pattern
  -- ponytail: inlined FASE7 NC after validity guard (keeps VAT engine)
  v_nc_id := public.create_credit_note_from_invoice_unchecked(p_invoice_id, p_amount, p_reason, p_rows);
  return v_nc_id;
end;
$$;

-- Keep FASE7 implementation under _unchecked name
create or replace function public.create_credit_note_from_invoice_unchecked(
  p_invoice_id uuid,
  p_amount numeric default null,
  p_reason text default null,
  p_rows jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_src record;
  v_nc_id uuid;
  v_numero integer;
  v_corr uuid := gen_random_uuid();
  v_src_row record;
  v_nc_row jsonb;
  v_processed jsonb;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
  v_use_rows jsonb;
begin
  select * into v_src from public.invoices where id = p_invoice_id for update;
  if v_src.numero is null then
    raise exception 'Fattura sorgente senza numerazione; emettere prima la fattura';
  end if;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    v_use_rows := p_rows;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'parent_invoice_row_id', r.id,
      'tipo', r.tipo,
      'descrizione', r.descrizione,
      'quantita', r.quantita,
      'prezzo_unitario', r.prezzo_unitario,
      'sconto_percent', r.sconto_percent,
      'vat_code_id', r.vat_code_id
    )), '[]'::jsonb)
    into v_use_rows
    from public.invoice_rows r
    where r.invoice_id = p_invoice_id;
  end if;

  if jsonb_array_length(v_use_rows) = 0 then
    raise exception 'Nessuna riga disponibile per nota di credito';
  end if;

  v_numero := public.allocate_document_number('nota_credito', v_src.anno, v_src.series, v_src.company_id);

  insert into public.invoices (
    company_id, numero, anno, series, status, document_type, document_status, payment_status, sdi_status,
    fattura_pa_tipo_documento, fiscal_validity, accounting_status,
    customer_id, cliente_label, customer_snapshot, data_emissione, parent_invoice_id,
    note, created_by, updated_by
  )
  values (
    v_src.company_id, v_numero, v_src.anno, v_src.series, 'emessa', 'nota_credito', 'emessa', 'non_pagata', 'da_generare',
    'TD04', 'pending', 'da_registrare',
    v_src.customer_id, v_src.cliente_label, v_src.customer_snapshot, current_date, p_invoice_id,
    coalesce(p_reason, 'Nota di credito'), v_uid, v_uid
  )
  returning id into v_nc_id;

  for v_nc_row in select * from jsonb_array_elements(v_use_rows)
  loop
    if v_nc_row->>'parent_invoice_row_id' is not null then
      select * into v_src_row from public.invoice_rows where id = (v_nc_row->>'parent_invoice_row_id')::uuid;
      if found and v_nc_row->>'vat_code_id' is null then
        v_nc_row := v_nc_row || jsonb_build_object('vat_code_id', v_src_row.vat_code_id);
      end if;
    end if;

    v_processed := public.vat_process_draft_row(
      v_src.company_id, current_date, 'sales', v_nc_row, -1
    );

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      vat_code_id, parent_invoice_row_id, imponibile, iva, totale, meta
    )
    values (
      v_nc_id,
      coalesce(nullif(v_nc_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_nc_row->>'descrizione'), ''), 'Riga nota di credito'),
      greatest(coalesce((v_nc_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_nc_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_nc_row->>'sconto_percent')::numeric, 0), 0), 100),
      (v_processed->>'iva_percent')::numeric,
      (v_processed->>'vat_code_id')::uuid,
      nullif(v_nc_row->>'parent_invoice_row_id', '')::uuid,
      (v_processed->>'imponibile')::numeric,
      (v_processed->>'iva')::numeric,
      (v_processed->>'totale')::numeric,
      coalesce(v_nc_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + (v_processed->>'imponibile')::numeric;
    v_iva := v_iva + (v_processed->>'iva')::numeric;
    v_totale := v_totale + (v_processed->>'totale')::numeric;
  end loop;

  perform public.vat_consolidate_invoice_rows(v_nc_id);

  update public.invoices
  set imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(abs(v_totale), 2),
      residuo = round(abs(v_totale), 2)
  where id = v_nc_id;

  insert into public.invoice_relations (source_invoice_id, target_invoice_id, relation_type, meta)
  values (p_invoice_id, v_nc_id, 'credit_note', jsonb_build_object('totale', abs(v_totale)));

  insert into public.customer_open_items (
    customer_id, source_type, source_id, invoice_id, document_number,
    amount_signed, remaining_signed, status
  )
  values (
    v_src.customer_id, 'credit_note', v_nc_id, v_nc_id,
    public.format_document_number('nota_credito', v_src.anno, v_src.series, v_numero),
    abs(v_totale), abs(v_totale), 'open'
  );

  perform public.invoice_insert_event(
    'invoice', v_nc_id, 'invoice', v_nc_id, v_nc_id,
    'document', 'credit_note_created', v_corr, null,
    jsonb_build_object('parent_invoice_id', p_invoice_id), v_uid
  );

  return v_nc_id;
end;
$$;

create or replace function public.create_debit_note_from_invoice(
  p_invoice_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src record;
  v_id uuid;
  v_numero integer;
  v_uid uuid := public.rbac_auth_uid();
  v_row record;
  v_processed jsonb;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
begin
  if not public.rbac_module_can('fatturazione', 'credit_note') then
    raise exception 'Permesso negato';
  end if;

  select * into v_src from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if coalesce(v_src.fiscal_validity, '') is distinct from 'validly_issued' then
    raise exception 'FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED';
  end if;

  v_numero := public.allocate_document_number('nota_debito', v_src.anno, v_src.series, v_src.company_id);

  insert into public.invoices (
    company_id, numero, anno, series, status, document_type, document_status, payment_status, sdi_status,
    fattura_pa_tipo_documento, fiscal_validity, accounting_status,
    customer_id, cliente_label, customer_snapshot, data_emissione, parent_invoice_id,
    note, created_by, updated_by
  ) values (
    v_src.company_id, v_numero, v_src.anno, v_src.series, 'emessa', 'nota_debito', 'emessa', 'non_pagata', 'da_generare',
    'TD05', 'pending', 'da_registrare',
    v_src.customer_id, v_src.cliente_label, v_src.customer_snapshot, current_date, p_invoice_id,
    coalesce(p_reason, 'Nota di debito'), v_uid, v_uid
  )
  returning id into v_id;

  for v_row in select * from public.invoice_rows where invoice_id = p_invoice_id
  loop
    v_processed := public.vat_process_draft_row(
      v_src.company_id, current_date, 'sales',
      jsonb_build_object(
        'tipo', v_row.tipo,
        'descrizione', v_row.descrizione,
        'quantita', v_row.quantita,
        'prezzo_unitario', v_row.prezzo_unitario,
        'sconto_percent', v_row.sconto_percent,
        'vat_code_id', v_row.vat_code_id
      ),
      1
    );
    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      vat_code_id, parent_invoice_row_id, imponibile, iva, totale, meta
    ) values (
      v_id, v_row.tipo, v_row.descrizione, v_row.quantita, v_row.prezzo_unitario, v_row.sconto_percent,
      (v_processed->>'iva_percent')::numeric, (v_processed->>'vat_code_id')::uuid, v_row.id,
      (v_processed->>'imponibile')::numeric, (v_processed->>'iva')::numeric, (v_processed->>'totale')::numeric,
      coalesce(v_row.meta, '{}'::jsonb)
    );
    v_imponibile := v_imponibile + (v_processed->>'imponibile')::numeric;
    v_iva := v_iva + (v_processed->>'iva')::numeric;
    v_totale := v_totale + (v_processed->>'totale')::numeric;
  end loop;

  perform public.vat_consolidate_invoice_rows(v_id);
  update public.invoices
  set imponibile = round(v_imponibile, 2), iva = round(v_iva, 2),
      totale = round(v_totale, 2), residuo = round(v_totale, 2)
  where id = v_id;

  insert into public.invoice_relations (source_invoice_id, target_invoice_id, relation_type, meta)
  values (p_invoice_id, v_id, 'correction', jsonb_build_object('kind', 'debit_note'));

  return v_id;
end;
$$;

-- Payment: validly_issued + overpay reject + payment op
create or replace function public.register_invoice_payment(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_invoice_id uuid;
  v_payment_id uuid;
  v_customer_payment_id uuid;
  v_importo numeric;
  v_paid numeric;
  v_total numeric;
  v_status text;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_fv text;
  v_residuo numeric;
  v_customer_id uuid;
  v_open_item_id uuid;
  v_corr uuid := gen_random_uuid();
  v_pay_event_id uuid;
begin
  if not public.rbac_module_can('fatturazione', 'payment') then
    raise exception 'Permesso negato';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_importo := (p_payload->>'importo')::numeric;
  if v_importo <= 0 then
    raise exception 'Importo pagamento non valido';
  end if;

  select totale, status, document_status, payment_status, sdi_status, customer_id, fiscal_validity, residuo
  into v_total, v_status, v_doc, v_pay, v_sdi, v_customer_id, v_fv, v_residuo
  from public.invoices
  where id = v_invoice_id
  for update;

  if v_status is null then
    raise exception 'Fattura non trovata';
  end if;
  if coalesce(v_fv, '') is distinct from 'validly_issued' then
    raise exception 'FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED';
  end if;
  if coalesce(v_doc, v_status) in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Pagamento non consentito per lo stato fattura corrente';
  end if;
  if round(v_importo, 2) > round(coalesce(v_residuo, v_total), 2) then
    raise exception 'PAYMENT_ALLOCATION_INVALID';
  end if;

  insert into public.invoice_payments (invoice_id, data, importo, metodo, riferimento, note, created_by)
  values (
    v_invoice_id,
    coalesce(nullif(p_payload->>'data', '')::date, current_date),
    v_importo,
    coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
    nullif(p_payload->>'riferimento', ''),
    nullif(p_payload->>'note', ''),
    v_uid
  )
  returning id into v_payment_id;

  v_pay_event_id := public.invoice_insert_event(
    'invoice_payment', v_payment_id, 'invoice', v_invoice_id, v_invoice_id,
    'payment', 'payment_registered', v_corr, null,
    jsonb_build_object('importo', v_importo),
    v_uid
  );

  select coalesce(sum(importo), 0) into v_paid
  from public.invoice_payments
  where invoice_id = v_invoice_id;

  v_pay := case
    when round(v_total - v_paid, 2) <= 0 and v_total > 0 then 'pagata'
    when v_paid > 0 then 'parzialmente_pagata'
    else coalesce(v_pay, 'non_pagata')
  end;

  update public.invoices
  set pagato = least(round(v_paid, 2), v_total),
      residuo = greatest(round(v_total - v_paid, 2), 0),
      updated_by = v_uid,
      version = version + 1
  where id = v_invoice_id;

  perform public.invoice_write_status_axes(
    v_invoice_id,
    coalesce(v_doc, 'emessa'),
    v_pay,
    coalesce(v_sdi, 'da_generare'),
    v_corr,
    v_pay_event_id,
    true,
    v_uid,
    'register_payment'
  );

  select id into v_open_item_id from public.customer_open_items
  where invoice_id = v_invoice_id and status in ('open', 'partial')
  order by due_date nulls last
  limit 1;

  if v_open_item_id is not null then
    update public.customer_open_items
    set remaining_signed = -greatest(round(v_total - v_paid, 2), 0),
        status = case when round(v_total - v_paid, 2) <= 0 then 'closed' when v_paid > 0 then 'partial' else status end,
        closed_at = case when round(v_total - v_paid, 2) <= 0 then coalesce(closed_at, now()) else null end,
        updated_at = now()
    where invoice_id = v_invoice_id and status <> 'cancelled';
  end if;

  insert into public.customer_payments (
    customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by
  )
  select customer_id, coalesce(nullif(p_payload->>'data', '')::date, current_date), v_importo,
         coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
         nullif(p_payload->>'riferimento', ''), nullif(p_payload->>'note', ''),
         'allocated', v_payment_id, v_uid
  from public.invoices where id = v_invoice_id
  returning id into v_customer_payment_id;

  if v_open_item_id is not null then
    insert into public.payment_allocations (payment_id, open_item_id, amount)
    values (v_customer_payment_id, v_open_item_id, v_importo)
    on conflict (payment_id, open_item_id) do update set amount = excluded.amount;
  end if;

  return v_payment_id;
end;
$$;

-- View: coda da fatturare
create or replace view public.v_ciclo_attivo_da_fatturare
with (security_invoker = true)
as
select
  'preventivo'::text as source_type,
  p.id as source_id,
  coalesce(p.dettagli->>'numero', p.id::text) as source_label,
  p.cliente as cliente_label,
  p.created_at::date as source_date,
  coalesce(p.totale, 0)::numeric as totale,
  public.invoice_source_allocated_total('preventivo', p.id, null) as gia_fatturato,
  round(greatest(coalesce(p.totale, 0) - public.invoice_source_allocated_total('preventivo', p.id, null), 0), 2) as residuo,
  null::date as deadline_fiscale
from public.preventivi p
where coalesce(p.dettagli->>'tipoDocumento', 'preventivo') = 'preventivo'
  and (
    coalesce(p.dettagli->>'statoCliente', '') = 'accettato'
    or p.stato_workflow = 'acquisito'
  )
  and round(greatest(coalesce(p.totale, 0) - public.invoice_source_allocated_total('preventivo', p.id, null), 0), 2) > 0
union all
select
  'consuntivo',
  p.id,
  coalesce(p.dettagli->>'numero', p.id::text),
  p.cliente,
  p.created_at::date,
  coalesce(p.totale, 0),
  public.invoice_source_allocated_total('consuntivo', p.id, null),
  round(greatest(coalesce(p.totale, 0) - public.invoice_source_allocated_total('consuntivo', p.id, null), 0), 2),
  null::date
from public.preventivi p
where coalesce(p.dettagli->>'tipoDocumento', 'preventivo') = 'consuntivo'
  and round(greatest(coalesce(p.totale, 0) - public.invoice_source_allocated_total('consuntivo', p.id, null), 0), 2) > 0
union all
select
  'ddt',
  d.id,
  coalesce(d.numero::text, d.id::text),
  coalesce(d.cliente_label, ''),
  d.data_documento,
  0,
  public.invoice_source_allocated_total('ddt', d.id, null),
  case when public.invoice_source_allocated_total('ddt', d.id, null) > 0 then 0 else 1 end,
  (date_trunc('month', d.data_documento) + interval '1 month + 14 days')::date
from public.ddt_documents d
where d.status in ('confermato', 'stampato', 'consegnato')
  and public.invoice_source_allocated_total('ddt', d.id, null) = 0;

grant select on public.v_ciclo_attivo_da_fatturare to authenticated;

-- Claim SDI jobs
create or replace function public.claim_invoice_sdi_jobs(p_limit integer default 10, p_worker text default 'sdi-worker')
returns setof public.invoice_sdi_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select j.id
    from public.invoice_sdi_jobs j
    where j.status in ('PENDING', 'RETRY')
      and j.next_attempt_at <= now()
    order by j.next_attempt_at
    for update skip locked
    limit greatest(p_limit, 1)
  )
  update public.invoice_sdi_jobs j
  set status = 'PROCESSING',
      locked_at = now(),
      locked_by = p_worker,
      attempt_count = j.attempt_count + 1
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;

-- Origine on create_invoice: expand via patch of check already in schema.
-- Hook assert_invoice_source_allocations into create by wrapping trigger.
create or replace function public.trg_invoice_assert_source_allocations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_invoice_source_allocations(new.invoice_id);
  return new;
end;
$$;

drop trigger if exists trg_invoice_links_assert_alloc on public.invoice_links;
create constraint trigger trg_invoice_links_assert_alloc
after insert or update on public.invoice_links
deferrable initially deferred
for each row execute function public.trg_invoice_assert_source_allocations();

-- Grants
revoke all on function public.billing_eligibility(text, uuid) from public, anon;
grant execute on function public.billing_eligibility(text, uuid) to authenticated;

revoke all on function public.handle_sdi_rejected(uuid, text) from public, anon;
grant execute on function public.handle_sdi_rejected(uuid, text) to authenticated, service_role;

revoke all on function public.handle_sdi_outcome(uuid, text, text, text) from public, anon;
grant execute on function public.handle_sdi_outcome(uuid, text, text, text) to authenticated, service_role;

revoke all on function public.create_debit_note_from_invoice(uuid, text) from public, anon;
grant execute on function public.create_debit_note_from_invoice(uuid, text) to authenticated;

revoke all on function public.claim_invoice_sdi_jobs(integer, text) from public, anon, authenticated;
grant execute on function public.claim_invoice_sdi_jobs(integer, text) to service_role;

create or replace function public.invoice_set_draft_origine(p_invoice_id uuid, p_origine text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;
  if p_origine not in ('manuale', 'preventivo', 'multi_preventivo', 'lavorazione', 'consuntivo', 'ddt') then
    raise exception 'Origine fattura non valida';
  end if;
  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if coalesce(v_inv.document_status, v_inv.status) not in ('bozza', 'da_verificare') then
    raise exception 'Origine modificabile solo in bozza';
  end if;
  update public.invoices set origine = p_origine, updated_at = now() where id = p_invoice_id;
end;
$$;

revoke all on function public.invoice_set_draft_origine(uuid, text) from public, anon;
grant execute on function public.invoice_set_draft_origine(uuid, text) to authenticated;

revoke all on function public.create_credit_note_from_invoice_unchecked(uuid, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.invoice_source_allocated_total(text, uuid, uuid) to authenticated;

comment on function public.handle_sdi_rejected(uuid, text) is
  'FASE 8 P0 — reversal tecnico su scarto SdI; non crea nota di credito.';

-- SDI catalog fanout via existing invoices outbox trigger (idempotent keys)
create or replace function public.trg_invoices_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  v_numero := case
    when new.numero is null then 'Bozza'
    else public.format_document_number(
      coalesce(new.document_type, 'fattura'),
      new.anno,
      new.series,
      new.numero
    )
  end;

  if old.status is distinct from new.status then
    if new.status in ('emessa', 'inviata')
       and old.status not in ('emessa', 'inviata') then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_issued',
        'invoices',
        new.id,
        'fatturazione.invoice_issued:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'pagata' and old.status is distinct from 'pagata'
          and coalesce(new.fiscal_validity, '') = 'validly_issued' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_paid',
        'invoices',
        new.id,
        'fatturazione.invoice_paid:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.status = 'scaduta' and old.status is distinct from 'scaduta'
          and coalesce(new.fiscal_validity, '') = 'validly_issued' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.invoice_overdue',
        'invoices',
        new.id,
        'fatturazione.invoice_overdue:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    end if;
  end if;

  if old.sdi_status is distinct from new.sdi_status then
    if new.sdi_status = 'scartata' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.sdi_rejected',
        'invoices',
        new.id,
        'fatturazione.sdi_rejected:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.sdi_status = 'consegnata' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.sdi_delivered',
        'invoices',
        new.id,
        'fatturazione.sdi_delivered:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    elsif new.sdi_status = 'impossibilita_consegna' then
      perform public.cab_enqueue_notification_outbox(
        'fatturazione.sdi_delivery_failed',
        'invoices',
        new.id,
        'fatturazione.sdi_delivery_failed:invoices:' || new.id::text,
        coalesce(new.updated_by, new.created_by),
        jsonb_build_object('numero', v_numero, 'cliente', new.cliente_label),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

commit;

notify pgrst, 'reload schema';
