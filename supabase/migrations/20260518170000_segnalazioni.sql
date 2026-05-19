-- Segnalazioni condivise (modulo Supporto): persistenza centralizzata, soft delete.

create table if not exists public.segnalazioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  tipo text not null default 'generale',
  messaggio text not null,
  entita_tipo text,
  entita_id uuid,
  stato text not null default 'attiva',
  deleted_at timestamptz,
  constraint segnalazioni_stato_chk check (stato in ('attiva', 'risolta')),
  constraint segnalazioni_messaggio_nonempty check (char_length(trim(messaggio)) > 0)
);

create index if not exists idx_segnalazioni_created_at on public.segnalazioni (created_at desc);
create index if not exists idx_segnalazioni_stato on public.segnalazioni (stato) where deleted_at is null;
create index if not exists idx_segnalazioni_created_by on public.segnalazioni (created_by);

comment on table public.segnalazioni is 'Note/segnalazioni condivise del modulo Supporto; soft delete via deleted_at.';

alter table public.segnalazioni enable row level security;

drop policy if exists segnalazioni_select_role on public.segnalazioni;
create policy segnalazioni_select_role
on public.segnalazioni for select to authenticated
using (
  deleted_at is null
  and public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale')
);

drop policy if exists segnalazioni_insert_role on public.segnalazioni;
create policy segnalazioni_insert_role
on public.segnalazioni for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale')
);

drop policy if exists segnalazioni_update_role on public.segnalazioni;
create policy segnalazioni_update_role
on public.segnalazioni for update to authenticated
using (
  public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale')
)
with check (
  public.current_profile_role() in ('admin', 'operatore', 'ospite', 'cliente', 'magazziniere', 'commerciale')
);

revoke all on table public.segnalazioni from public;
revoke all on table public.segnalazioni from anon;
grant select, insert, update on table public.segnalazioni to authenticated;

-- Realtime (invalidazione cache client su INSERT/UPDATE).
do $$
begin
  alter publication supabase_realtime add table public.segnalazioni;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
