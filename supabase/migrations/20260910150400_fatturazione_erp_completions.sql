-- ERP Fatturazione Hub — completamenti: numerazione, link DDT, scritture auto base.
begin;

alter table public.invoice_links drop constraint if exists invoice_links_source_type_chk;
alter table public.invoice_links add constraint invoice_links_source_type_chk check (
  source_type in ('preventivo', 'lavorazione', 'mezzo', 'attrezzatura', 'ricambio', 'ddt')
);

create or replace function public.allocate_invoice_number(
  p_document_type text default 'fattura',
  p_series text default 'default',
  p_year integer default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
  v_next integer;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;
  if p_document_type not in ('fattura', 'nota_credito', 'proforma') then
    raise exception 'Tipo documento non valido';
  end if;

  insert into public.invoice_number_sequences (year, document_type, series, last_number)
  values (v_year, p_document_type, coalesce(nullif(p_series, ''), 'default'), 0)
  on conflict (year, document_type, series) do nothing;

  update public.invoice_number_sequences
  set last_number = last_number + 1,
      updated_at = now()
  where year = v_year
    and document_type = p_document_type
    and series = coalesce(nullif(p_series, ''), 'default')
  returning last_number into v_next;

  return v_next;
end;
$$;

grant execute on function public.allocate_invoice_number(text, text, integer) to authenticated;

commit;
