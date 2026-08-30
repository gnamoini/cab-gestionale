-- Email composition drafts (SSOT for in-progress composed communications).

begin;

create table if not exists public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  use_case text not null,
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sending')),
  sender_email text not null default '',
  sender_display_name text not null default '',
  to_emails jsonb not null default '[]'::jsonb,
  cc_emails jsonb not null default '[]'::jsonb,
  bcc_emails jsonb not null default '[]'::jsonb,
  subject text not null default '',
  body_text text not null default '',
  attachment_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists communication_drafts_active_author_idx
  on public.communication_drafts (use_case, entity_type, entity_id, author_id)
  where status = 'draft';

create index if not exists communication_drafts_entity_idx
  on public.communication_drafts (entity_type, entity_id, updated_at desc);

alter table public.communication_drafts enable row level security;
revoke all on public.communication_drafts from public, anon, authenticated;

-- Upsert draft (author-scoped active draft)
create or replace function public.cab_upsert_communication_draft(
  p_use_case text,
  p_entity_type text,
  p_entity_id uuid,
  p_author_id uuid,
  p_sender_email text,
  p_sender_display_name text,
  p_to_emails jsonb,
  p_cc_emails jsonb,
  p_bcc_emails jsonb,
  p_subject text,
  p_body_text text,
  p_attachment_refs jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_use_case is null or p_entity_type is null or p_entity_id is null or p_author_id is null then
    return null;
  end if;

  select d.id into v_id
  from public.communication_drafts d
  where d.use_case = trim(p_use_case)
    and d.entity_type = trim(p_entity_type)
    and d.entity_id = p_entity_id
    and d.author_id = p_author_id
    and d.status = 'draft'
  limit 1;

  if v_id is not null then
    update public.communication_drafts
    set
      sender_email = coalesce(p_sender_email, ''),
      sender_display_name = coalesce(p_sender_display_name, ''),
      to_emails = coalesce(p_to_emails, '[]'::jsonb),
      cc_emails = coalesce(p_cc_emails, '[]'::jsonb),
      bcc_emails = coalesce(p_bcc_emails, '[]'::jsonb),
      subject = coalesce(p_subject, ''),
      body_text = coalesce(p_body_text, ''),
      attachment_refs = coalesce(p_attachment_refs, '[]'::jsonb),
      updated_at = now()
    where id = v_id;
    return v_id;
  end if;

  insert into public.communication_drafts (
    use_case,
    entity_type,
    entity_id,
    author_id,
    status,
    sender_email,
    sender_display_name,
    to_emails,
    cc_emails,
    bcc_emails,
    subject,
    body_text,
    attachment_refs
  ) values (
    trim(p_use_case),
    trim(p_entity_type),
    p_entity_id,
    p_author_id,
    'draft',
    coalesce(p_sender_email, ''),
    coalesce(p_sender_display_name, ''),
    coalesce(p_to_emails, '[]'::jsonb),
    coalesce(p_cc_emails, '[]'::jsonb),
    coalesce(p_bcc_emails, '[]'::jsonb),
    coalesce(p_subject, ''),
    coalesce(p_body_text, ''),
    coalesce(p_attachment_refs, '[]'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.cab_upsert_communication_draft(
  text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.cab_upsert_communication_draft(
  text, text, uuid, uuid, text, text, jsonb, jsonb, jsonb, text, text, jsonb
) to service_role;

-- Get active draft for author + entity
create or replace function public.cab_get_communication_draft(
  p_use_case text,
  p_entity_type text,
  p_entity_id uuid,
  p_author_id uuid
)
returns public.communication_drafts
language sql
security definer
set search_path = public
stable
as $$
  select d.*
  from public.communication_drafts d
  where d.use_case = trim(p_use_case)
    and d.entity_type = trim(p_entity_type)
    and d.entity_id = p_entity_id
    and d.author_id = p_author_id
    and d.status in ('draft', 'sending')
  order by d.updated_at desc
  limit 1;
$$;

revoke all on function public.cab_get_communication_draft(text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cab_get_communication_draft(text, text, uuid, uuid)
  to service_role;

-- Claim draft for send (draft -> sending)
create or replace function public.cab_claim_communication_draft_send(p_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.communication_drafts
  set status = 'sending', updated_at = now()
  where id = p_draft_id and status = 'draft';
  return found;
end;
$$;

revoke all on function public.cab_claim_communication_draft_send(uuid) from public, anon, authenticated;
grant execute on function public.cab_claim_communication_draft_send(uuid) to service_role;

-- Release draft after send (delete row)
create or replace function public.cab_release_communication_draft(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.communication_drafts where id = p_draft_id;
end;
$$;

revoke all on function public.cab_release_communication_draft(uuid) from public, anon, authenticated;
grant execute on function public.cab_release_communication_draft(uuid) to service_role;

-- Get draft by id
create or replace function public.cab_get_communication_draft_by_id(p_draft_id uuid)
returns public.communication_drafts
language sql
security definer
set search_path = public
stable
as $$
  select d.* from public.communication_drafts d where d.id = p_draft_id limit 1;
$$;

revoke all on function public.cab_get_communication_draft_by_id(uuid) from public, anon, authenticated;
grant execute on function public.cab_get_communication_draft_by_id(uuid) to service_role;

commit;
