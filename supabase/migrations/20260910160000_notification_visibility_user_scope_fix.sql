-- Fix: staff admin/manager non devono vedere notifiche user-scoped di altri utenti
-- (es. client_portal_completata per clienti → duplicati visivi con lavorazione_completata).

begin;

create or replace function public.notification_visible_to_auth_user(p_n public.notifications)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      public.notification_staff_inbox_eligible()
      and (
        p_n.scope_type = 'global'
        or (p_n.scope_type = 'user' and p_n.scope_value = auth.uid()::text)
        or (
          p_n.scope_type = 'role'
          and (
            p_n.scope_value = public.rbac_role()
            or public.rbac_role() in ('admin', 'manager')
          )
          and public.user_effective_can(p_n.scope_module, 'read')
        )
      )
    )
    or (
      public.notification_cliente_inbox_eligible()
      and p_n.scope_type = 'user'
      and p_n.scope_value = auth.uid()::text
      and p_n.type in ('client_portal_ingresso', 'client_portal_completata')
    );
$$;

commit;
