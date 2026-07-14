-- Personale tecnico (operatore): niente dashboard — home su prima pagina accessibile (es. agenda).

begin;

insert into public.role_page_access (role_id, page_key, access_level)
select r.id, 'dashboard', 'none'
from public.roles r
where r.key = 'operatore' and r.is_active
on conflict (role_id, page_key) do update
  set access_level = excluded.access_level,
      updated_at = now();

commit;
