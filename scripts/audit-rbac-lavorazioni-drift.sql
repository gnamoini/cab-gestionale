-- Audit RBAC drift: lavorazioni write path (read-only).
-- Eseguire su staging/prod con service role o utente security.
-- Confronta profile vs rbac_role_for_user vs RLS effective can.

-- 1) Panoramica utenti ERP con possibile drift ruolo
select
  p.id as user_id,
  p.nome,
  p.username,
  p.role_key as profile_role,
  public.rbac_role_for_user(p.id) as effective_role,
  (p.role_key is distinct from public.rbac_role_for_user(p.id)) as role_drift,
  r.key as user_roles_role,
  public.user_effective_can(p.id, 'lavorazioni', 'write') as rls_lavorazioni_write,
  public.user_effective_can(p.id, 'mezzi', 'write') as rls_mezzi_write,
  (
    select upo.access_level
    from public.user_page_overrides upo
    where upo.user_id = p.id and upo.page_key = 'lavorazioni'
  ) as override_lavorazioni,
  (
    select rpa.access_level
    from public.role_page_access rpa
    join public.roles ro on ro.id = rpa.role_id
    where ro.key = public.rbac_role_for_user(p.id) and rpa.page_key = 'lavorazioni'
  ) as role_page_lavorazioni
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
left join public.roles r on r.id = ur.role_id
where p.role_key not in ('cliente', 'guest')
   or public.rbac_role_for_user(p.id) not in ('cliente', 'guest')
order by role_drift desc, effective_role, p.nome;

-- 2) Solo drift profile vs user_roles (candidati security_set_user_role)
select
  p.id,
  p.nome,
  p.role_key as profile_role,
  public.rbac_role_for_user(p.id) as effective_role
from public.profiles p
where p.role_key is distinct from public.rbac_role_for_user(p.id);

-- 3) Ruoli write attesi ma RLS deny (config DB errata)
select
  p.id,
  p.nome,
  public.rbac_role_for_user(p.id) as effective_role,
  public.user_effective_can(p.id, 'lavorazioni', 'write') as rls_lavorazioni_write
from public.profiles p
where public.rbac_role_for_user(p.id) in ('admin', 'manager', 'operatore')
  and public.user_effective_can(p.id, 'lavorazioni', 'write') = false;

-- 4) Override utente che nega lavorazioni (deny intenzionale — non fixare nel codice)
select
  p.id,
  p.nome,
  public.rbac_role_for_user(p.id) as effective_role,
  upo.access_level
from public.user_page_overrides upo
join public.profiles p on p.id = upo.user_id
where upo.page_key = 'lavorazioni' and upo.access_level = 'none';
