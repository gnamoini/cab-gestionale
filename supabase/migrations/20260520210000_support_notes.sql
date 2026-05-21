-- Note condivise modulo Supporto (source of truth persistente, soft delete, realtime).

create table if not exists public.support_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  deleted_at timestamptz,
  constraint support_notes_content_nonempty check (char_length(trim(content)) > 0)
);

create index if not exists idx_support_notes_created_at on public.support_notes (created_at desc);
create index if not exists idx_support_notes_active on public.support_notes (created_at desc) where deleted_at is null;

comment on table public.support_notes is 'Note condivise pagina Supporto; visibili a utenti con can_read_operational.';

drop trigger if exists trg_support_notes_updated_at on public.support_notes;
create trigger trg_support_notes_updated_at
before update on public.support_notes
for each row execute function public.set_updated_at();

alter table public.support_notes enable row level security;

drop policy if exists cap_support_notes_select on public.support_notes;
create policy cap_support_notes_select on public.support_notes for select to authenticated
using (deleted_at is null and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational'));

drop policy if exists cap_support_notes_insert on public.support_notes;
create policy cap_support_notes_insert on public.support_notes for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_support_notes_update on public.support_notes;
create policy cap_support_notes_update on public.support_notes for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

revoke all on table public.support_notes from public;
revoke all on table public.support_notes from anon;
grant select, insert, update on table public.support_notes to authenticated;

-- Migrazione dati legacy da segnalazioni (se presenti).
insert into public.support_notes (id, content, created_by, created_at, updated_at, resolved_at, deleted_at)
select
  s.id,
  s.messaggio,
  s.created_by,
  s.created_at,
  s.created_at,
  case when s.stato = 'risolta' then s.created_at else null end,
  s.deleted_at
from public.segnalazioni s
where not exists (select 1 from public.support_notes n where n.id = s.id);

do $$
begin
  alter publication supabase_realtime add table public.support_notes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
