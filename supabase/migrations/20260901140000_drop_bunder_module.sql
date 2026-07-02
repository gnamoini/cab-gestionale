-- Remove BUNDER module (page and app code deleted).

drop policy if exists bunder_documents_select on public.bunder_documents;
drop policy if exists bunder_documents_insert on public.bunder_documents;
drop policy if exists bunder_documents_update on public.bunder_documents;
drop policy if exists bunder_documents_delete on public.bunder_documents;

do $$
begin
  alter publication supabase_realtime drop table public.bunder_documents;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;

drop table if exists public.bunder_documents cascade;

drop function if exists public.rbac_bunder_can(text);
