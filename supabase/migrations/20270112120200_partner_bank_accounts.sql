-- FASE 5 — Partner bank accounts (cliente).
begin;

create table if not exists public.cliente_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clienti_anagrafiche (id) on delete cascade,
  iban_normalized text not null,
  bank_name text,
  bic text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cliente_bank_accounts_iban_chk check (
    char_length(trim(iban_normalized)) >= 15 and char_length(trim(iban_normalized)) <= 34
  )
);

create index if not exists idx_cliente_bank_accounts_cliente_id
  on public.cliente_bank_accounts (cliente_id);

create unique index if not exists idx_cliente_bank_accounts_one_default
  on public.cliente_bank_accounts (cliente_id)
  where is_default = true and is_active = true;

create or replace function public.cliente_bank_accounts_normalize_iban()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.iban_normalized := public.admin_normalize_iban(new.iban_normalized);
  if new.iban_normalized is null then
    raise exception 'IBAN required';
  end if;
  new.bic := upper(trim(coalesce(new.bic, '')));
  if new.bic = '' then
    new.bic := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cliente_bank_accounts_normalize on public.cliente_bank_accounts;
create trigger trg_cliente_bank_accounts_normalize
before insert or update on public.cliente_bank_accounts
for each row execute function public.cliente_bank_accounts_normalize_iban();

drop trigger if exists trg_cliente_bank_accounts_updated_at on public.cliente_bank_accounts;
create trigger trg_cliente_bank_accounts_updated_at
before update on public.cliente_bank_accounts
for each row execute function public.set_updated_at();

alter table public.cliente_bank_accounts enable row level security;

comment on table public.cliente_bank_accounts is 'FASE 5 — Conti bancari cliente (IBAN ≠ identità anagrafica).';

commit;
