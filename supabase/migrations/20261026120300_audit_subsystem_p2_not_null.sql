-- Audit P2: backfill colonne + NOT NULL constraints.

update public.log_modifiche
set event_type = 'DATA_CHANGE'
where event_type is null;

update public.log_modifiche
set actor_type = case
  when autore_id is not null then 'USER'
  else 'SYSTEM'
end
where actor_type is null;

update public.log_modifiche
set severity = 'info'
where severity is null;

update public.log_modifiche lm
set company_id = p.company_id
from public.profiles p
where lm.company_id is null
  and lm.autore_id = p.id
  and p.company_id is not null;

-- Righe senza autore: prima company nota (single-tenant fallback documentato).
update public.log_modifiche lm
set company_id = (
  select c.id from public.companies c order by c.created_at nulls last limit 1
)
where lm.company_id is null
  and exists (select 1 from public.companies c limit 1);

alter table public.log_modifiche
  alter column event_type set default 'DATA_CHANGE',
  alter column event_type set not null,
  alter column actor_type set default 'USER',
  alter column actor_type set not null,
  alter column severity set default 'info',
  alter column severity set not null;

-- company_id NOT NULL solo se backfill completo (zero null rimasti).
do $$
begin
  if not exists (select 1 from public.log_modifiche where company_id is null limit 1) then
    alter table public.log_modifiche alter column company_id set not null;
  else
    raise notice 'audit P2: company_id ancora NULL su alcune righe — NOT NULL rimandato';
  end if;
end $$;
