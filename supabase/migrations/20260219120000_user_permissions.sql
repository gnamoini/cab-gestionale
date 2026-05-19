-- Permessi granulari per modulo (ERP multi-utente).
-- Fallback ruolo se assente riga in user_permissions: admin = tutto; operatore = read+write; ospite = read-only.
-- RLS su app_settings basata su public.user_effective_can(module, op).

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  can_admin boolean not null default false,
  primary key (user_id, module),
  constraint user_permissions_module_chk check (
    module in ('magazzino', 'preventivi', 'lavorazioni', 'mezzi', 'report', 'documenti')
  )
);

create index if not exists idx_user_permissions_user on public.user_permissions (user_id);

comment on table public.user_permissions is 'Permessi ERP per modulo; assenza riga = fallback da profiles.ruolo.';

alter table public.user_permissions enable row level security;

drop policy if exists user_permissions_select_own_or_admin on public.user_permissions;
create policy user_permissions_select_own_or_admin
on public.user_permissions for select to authenticated
using (
  user_id = auth.uid()
  or public.current_profile_role() = 'admin'
);

drop policy if exists user_permissions_write_admin on public.user_permissions;
create policy user_permissions_write_admin
on public.user_permissions for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

grant select on table public.user_permissions to authenticated;
grant insert, update, delete on table public.user_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- Valutazione effettiva permesso (SECURITY DEFINER: lettura user_permissions senza ricorsione RLS)
-- ---------------------------------------------------------------------------
create or replace function public.user_effective_can(p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  r record;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_role := public.current_profile_role();
  if v_role = 'admin' then
    return true;
  end if;

  select can_read, can_write, can_admin
    into r
  from public.user_permissions up
  where up.user_id = auth.uid()
    and up.module = p_module
  limit 1;

  if found then
    if p_op = 'read' then
      return r.can_read;
    elsif p_op = 'write' then
      return r.can_write;
    elsif p_op = 'admin' then
      return r.can_admin;
    end if;
    return false;
  end if;

  if v_role in ('ospite', 'sola_lettura') then
    return p_op = 'read';
  end if;
  if v_role in ('operatore', 'magazziniere', 'commerciale') then
    return p_op in ('read', 'write');
  end if;
  return false;
end;
$$;

revoke all on function public.user_effective_can(text, text) from public;
grant execute on function public.user_effective_can(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- app_settings: select per profilo + permesso read sul modulo riga
-- write: permesso write sul modulo (admin ruolo già coperto dalla funzione)
-- ---------------------------------------------------------------------------
drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and public.user_effective_can(module, 'read')
);

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin
on public.app_settings for insert to authenticated
with check (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and public.user_effective_can(module, 'write')
);

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
on public.app_settings for update to authenticated
using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and public.user_effective_can(module, 'write')
)
with check (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and public.user_effective_can(module, 'write')
);

drop policy if exists app_settings_delete_admin on public.app_settings;
create policy app_settings_delete_admin
on public.app_settings for delete to authenticated
using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and (
    public.current_profile_role() = 'admin'
    or public.user_effective_can(module, 'admin')
  )
);

-- ---------------------------------------------------------------------------
-- Seed: admin → full access su tutti i moduli tracciati
-- ---------------------------------------------------------------------------
insert into public.user_permissions (user_id, module, can_read, can_write, can_admin)
select p.id, m.module, true, true, true
from public.profiles p
cross join (
  values
    ('magazzino'),
    ('preventivi'),
    ('lavorazioni'),
    ('mezzi'),
    ('report'),
    ('documenti')
) as m(module)
where p.ruolo = 'admin'
on conflict (user_id, module) do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  can_admin = excluded.can_admin;
