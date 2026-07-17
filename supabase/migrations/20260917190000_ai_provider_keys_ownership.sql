-- AI provider keys — ownership, disable reason, rotation linkage

alter table public.ai_provider_keys
  add column if not exists source text not null default 'migration'
    check (source in ('env_bootstrap', 'admin_ui', 'migration')),
  add column if not exists managed_by text not null default 'administrator'
    check (managed_by in ('runtime_sync', 'administrator')),
  add column if not exists disabled_reason text null
    check (
      disabled_reason is null
      or disabled_reason in ('env_removed', 'manual_admin', 'provider_invalid', 'security_rotation')
    ),
  add column if not exists rotation_replaced_by uuid null
    references public.ai_provider_keys(id) on delete set null;

create index if not exists ai_provider_keys_managed_by_idx
  on public.ai_provider_keys (managed_by, enabled);

create index if not exists ai_provider_keys_fingerprint_idx
  on public.ai_provider_keys (key_fingerprint);

-- Existing rows from initial migration → administrator-owned
update public.ai_provider_keys
set source = 'migration', managed_by = 'administrator'
where source = 'migration' and managed_by = 'administrator';
