-- FASE 5 — Gate A8: remove legacy billing_customers (post app migration).
begin;

-- FK already repointed in A5; safe to drop legacy tables.
drop table if exists public.billing_customer_profiles cascade;
drop table if exists public.billing_customers cascade;

commit;
