-- ddt_receiving: map import kind to magazzino_carichi for upload policy RBAC

begin;

create or replace function public.import_file_kind_to_module(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'ordine_fornitore' then 'ordini_fornitori'
    when 'listino' then 'magazzino'
    when 'magazzino' then 'magazzino'
    when 'ai_input' then 'document_capture'
    when 'ddt_receiving' then 'magazzino_carichi'
    else null
  end;
$$;

commit;
