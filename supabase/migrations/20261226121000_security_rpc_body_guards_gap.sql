-- Gap body guards (explicit, no classification loop) — SEC-002/SEC-004

-- SEC-004: attrezzatura assignment requires attrezzature write
create or replace function public.open_attrezzatura_assignment(
  p_attrezzatura_id uuid,
  p_mezzo_id uuid,
  p_change_reason public.assignment_change_reason default 'installazione',
  p_note text default null,
  p_actor_id uuid default null,
  p_valid_from timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid;
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('attrezzature', 'write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  v_actor := auth.uid();
  if p_actor_id is not null and p_actor_id <> v_actor then
    raise exception 'p_actor_id non consentito' using errcode = '42501';
  end if;

  insert into public.asset_assignment_history (
    attrezzatura_id, mezzo_id, valid_from, change_reason, note, created_by
  ) values (
    p_attrezzatura_id, p_mezzo_id, p_valid_from, p_change_reason, p_note, v_actor
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.close_attrezzatura_assignment(
  p_attrezzatura_id uuid,
  p_change_reason public.assignment_change_reason default 'smontaggio',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.security_assert_authenticated();
  if not public.rbac_module_can('attrezzature', 'write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  update public.asset_assignment_history
  set valid_to = now(), change_reason = p_change_reason, note = coalesce(p_note, note)
  where attrezzatura_id = p_attrezzatura_id and valid_to is null;
end;
$$;

-- SEC-002: invoice_write_status_axes — SERVER_ONLY; force actor from session when called internally
create or replace function public.invoice_write_status_axes(
  p_invoice_id uuid,
  p_document_status text,
  p_payment_status text,
  p_sdi_status text,
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_emit_event boolean default true,
  p_actor_id uuid default null,
  p_transition text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_old record;
  v_corr uuid := coalesce(p_correlation_id, gen_random_uuid());
  v_event_id uuid;
  v_session uuid := auth.uid();
begin
  if v_session is not null then
    if p_actor_id is not null and p_actor_id <> v_session then
      raise exception 'p_actor_id non consentito' using errcode = '42501';
    end if;
    v_uid := v_session;
  else
    v_uid := p_actor_id;
  end if;

  select document_status, payment_status, sdi_status
  into v_old
  from public.invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fattura non trovata';
  end if;

  if v_old.document_status is not distinct from p_document_status
     and v_old.payment_status is not distinct from p_payment_status
     and v_old.sdi_status is not distinct from p_sdi_status
  then
    return null;
  end if;

  perform set_config('invoice.axes_write_ssot', 'true', true);

  update public.invoices
  set document_status = p_document_status,
      payment_status = p_payment_status,
      sdi_status = p_sdi_status,
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
      'sdi_status', p_sdi_status
    ),
    v_uid
  );
  return v_event_id;
end;
$$;

notify pgrst, 'reload schema';
