begin;

-- ---------------------------------------------------------------------------
-- companies + profiles.company_id (3-step)
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  constraint companies_name_chk check (char_length(trim(name)) > 0)
);

insert into public.companies (id, name, slug)
values ('00000000-0000-4000-8000-000000000001'::uuid, 'Default', 'default')
on conflict (id) do nothing;

alter table public.profiles
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

update public.profiles
set company_id = '00000000-0000-4000-8000-000000000001'::uuid
where company_id is null;

alter table public.profiles
  alter column company_id set not null;

create index if not exists idx_profiles_company_id on public.profiles (company_id);

create or replace function public.rbac_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id from public.profiles p where p.id = auth.uid();
$$;

comment on function public.rbac_user_company_id() is
  'Tenant company per utente autenticato; NULL se profilo assente.';

grant execute on function public.rbac_user_company_id() to authenticated;