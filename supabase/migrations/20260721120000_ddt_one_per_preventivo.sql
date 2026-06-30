-- DDT embedded in Preventivi: un solo DDT attivo per preventivo, sostituzione atomica.

-- Normalizza duplicati legacy (mantiene il più recente).
with ranked as (
  select id,
         row_number() over (partition by preventivo_id order by created_at desc) as rn
  from public.ddt_documents
  where preventivo_id is not null
    and status <> 'annullato'
)
update public.ddt_documents d
set status = 'annullato',
    annullato_at = coalesce(d.annullato_at, now()),
    updated_by = coalesce(d.updated_by, d.created_by)
from ranked r
where d.id = r.id
  and r.rn > 1;

create unique index if not exists uq_ddt_documents_active_preventivo
  on public.ddt_documents (preventivo_id)
  where preventivo_id is not null and status <> 'annullato';

-- Allinea permessi modulo ddt a chi ha già preventivi (UI embedded usa preventivi.write).
insert into public.user_permissions (user_id, module, can_read, can_write, can_admin)
select user_id, 'ddt', can_read, can_write, can_admin
from public.user_permissions
where module = 'preventivi'
on conflict (user_id, module) do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  can_admin = excluded.can_admin;

create or replace function public.replace_ddt_for_preventivo(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preventivo_id uuid;
  v_uid uuid := public.rbac_auth_uid();
begin
  if not public.rbac_module_can('ddt', 'write')
     and not public.rbac_module_can('preventivi', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_preventivo_id := nullif(p_payload->>'preventivo_id', '')::uuid;
  if v_preventivo_id is null then
    raise exception 'preventivo_id obbligatorio';
  end if;

  update public.ddt_documents
  set status = 'annullato',
      annullato_at = now(),
      updated_by = v_uid
  where preventivo_id = v_preventivo_id
    and status <> 'annullato';

  return public.create_ddt_with_rows(p_payload);
end;
$$;

grant execute on function public.replace_ddt_for_preventivo(jsonb) to authenticated;
