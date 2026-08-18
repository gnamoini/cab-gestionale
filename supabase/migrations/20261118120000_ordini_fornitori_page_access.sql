-- Pagina dedicata /ordini-fornitori — RBAC page SSOT (decoupled da preventivi).

delete from public.rbac_page_module_expansion
where page_key = 'preventivi' and module = 'ordini_fornitori';

insert into public.rbac_page_module_expansion (page_key, module)
values ('ordini_fornitori', 'ordini_fornitori')
on conflict do nothing;

insert into public.role_page_access (role_id, page_key, access_level)
select rpa.role_id, 'ordini_fornitori', rpa.access_level
from public.role_page_access rpa
where rpa.page_key = 'preventivi'
on conflict (role_id, page_key) do nothing;

insert into public.user_page_overrides (user_id, page_key, access_level)
select upo.user_id, 'ordini_fornitori', upo.access_level
from public.user_page_overrides upo
where upo.page_key = 'preventivi'
on conflict (user_id, page_key) do nothing;
