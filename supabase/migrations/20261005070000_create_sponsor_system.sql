create type public.sponsor_registration_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.sponsorship_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price_display text,
  benefits text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_tier_name_not_blank check (char_length(trim(name)) > 0)
);

-- tier_id has no ON DELETE action: a tier that has applications cannot be deleted.
create table public.sponsor_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  tier_id uuid not null references public.sponsorship_tiers(id),
  company_name text not null,
  logo_url text,
  contact_name text not null,
  contact_email text not null,
  message text,
  status public.sponsor_registration_status not null default 'pending',
  sponsor_user_id uuid references auth.users(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_company_not_blank check (char_length(trim(company_name)) > 0),
  constraint sponsor_contact_not_blank check (char_length(trim(contact_name)) > 0),
  constraint sponsor_email_not_blank check (char_length(trim(contact_email)) > 0)
);

create unique index sponsor_registrations_one_open_per_email
  on public.sponsor_registrations (event_id, lower(contact_email))
  where status in ('pending', 'approved');

create index sponsorship_tiers_event_idx on public.sponsorship_tiers (event_id, sort_order);
create index sponsor_registrations_event_id_idx on public.sponsor_registrations (event_id);
create index sponsor_registrations_sponsor_user_id_idx on public.sponsor_registrations (sponsor_user_id);

-- Lead rows hold a snapshot of the consented fields taken at scan time, so the
-- sponsor never needs read access to the attendee's registration row.
create table public.sponsor_leads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sponsor_registration_id uuid not null references public.sponsor_registrations(id) on delete cascade,
  attendee_registration_id uuid not null references public.registrations(id) on delete cascade,
  captured_by uuid not null references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text not null,
  company_name text,
  job_title text,
  notes text,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sponsor_registration_id, attendee_registration_id)
);

create index sponsor_leads_sponsor_idx on public.sponsor_leads (sponsor_registration_id, captured_at desc);

alter table public.registrations
  add column sponsor_lead_consent boolean not null default false,
  add column sponsor_lead_consented_at timestamptz;

create trigger sponsorship_tiers_set_updated_at
before update on public.sponsorship_tiers
for each row execute procedure public.set_updated_at();

create trigger sponsor_registrations_set_updated_at
before update on public.sponsor_registrations
for each row execute procedure public.set_updated_at();

create trigger sponsor_leads_set_updated_at
before update on public.sponsor_leads
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

create or replace function public.is_sponsor_owner(p_sponsor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sponsor_registrations s
    where s.id = p_sponsor_id
      and s.status = 'approved'
      and s.sponsor_user_id = (select auth.uid())
      and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.sponsorship_tiers enable row level security;
alter table public.sponsor_registrations enable row level security;
alter table public.sponsor_leads enable row level security;

create policy "Tiers are public for published events and visible to the team"
on public.sponsorship_tiers for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));

create policy "Admins can create tiers"
on public.sponsorship_tiers for insert to authenticated
with check (public.is_event_admin(event_id));

create policy "Admins can edit tiers"
on public.sponsorship_tiers for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete tiers"
on public.sponsorship_tiers for delete to authenticated
using (public.is_event_admin(event_id));

create policy "Event admins can view sponsor applications"
on public.sponsor_registrations for select to authenticated
using (public.is_event_admin(event_id));

create policy "Approved sponsors can view their own registration"
on public.sponsor_registrations for select to authenticated
using (public.is_sponsor_owner(id));

-- No insert/update/delete policies on sponsor_registrations: writes use the functions below.

create policy "Sponsors can view their own leads"
on public.sponsor_leads for select to authenticated
using (public.is_sponsor_owner(sponsor_registration_id));

-- No write policies on sponsor_leads. The attendee's registration id stays hidden
-- from sponsors through column-level privileges.
revoke all on public.sponsor_leads from anon, authenticated;
grant select (id, event_id, sponsor_registration_id, first_name, last_name, email,
              company_name, job_title, notes, captured_at, updated_at)
  on public.sponsor_leads to authenticated;

-- ---------------------------------------------------------------------------
-- Public application (the browser never sets status or sponsor_user_id)
-- ---------------------------------------------------------------------------

create or replace function public.create_sponsor_application(
  p_event_id uuid,
  p_tier_id uuid,
  p_company_name text,
  p_contact_name text,
  p_contact_email text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company text := btrim(coalesce(p_company_name, ''));
  v_contact text := btrim(coalesce(p_contact_name, ''));
  v_email text := btrim(coalesce(p_contact_email, ''));
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_event_title text;
  v_tier_name text;
begin
  select e.title into v_event_title
  from public.events e
  where e.id = p_event_id and e.status = 'published';
  if v_event_title is null then raise exception 'EVENT_UNAVAILABLE'; end if;

  select t.name into v_tier_name
  from public.sponsorship_tiers t
  where t.id = p_tier_id and t.event_id = p_event_id;
  if v_tier_name is null then raise exception 'INVALID_TIER'; end if;

  if v_company = '' or char_length(v_company) > 200 then raise exception 'INVALID_INPUT:companyName'; end if;
  if v_contact = '' or char_length(v_contact) > 200 then raise exception 'INVALID_INPUT:contactName'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_INPUT:contactEmail';
  end if;
  if v_message is not null and char_length(v_message) > 2000 then raise exception 'INVALID_INPUT:message'; end if;

  begin
    insert into public.sponsor_registrations
      (event_id, tier_id, company_name, contact_name, contact_email, message, status)
    values (p_event_id, p_tier_id, v_company, v_contact, v_email, v_message, 'pending');
  exception when unique_violation then
    raise exception 'DUPLICATE_APPLICATION';
  end;

  return jsonb_build_object('event_title', v_event_title, 'tier_name', v_tier_name);
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizer decision
-- ---------------------------------------------------------------------------

create or replace function public.decide_sponsor_application(p_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sr public.sponsor_registrations%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'INVALID_DECISION'; end if;

  select * into v_sr from public.sponsor_registrations where id = p_id for update;
  if not found or not public.is_event_admin(v_sr.event_id) then raise exception 'NOT_FOUND'; end if;
  if v_sr.status <> 'pending' then raise exception 'NOT_PENDING'; end if;

  update public.sponsor_registrations
  set status = p_decision::public.sponsor_registration_status,
      approved_at = case when p_decision = 'approved' then now() else approved_at end,
      rejected_at = case when p_decision = 'rejected' then now() else rejected_at end
  where id = p_id;

  return jsonb_build_object('id', p_id, 'status', p_decision);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sponsor portal: state, claim, profile
-- ---------------------------------------------------------------------------

create or replace function public.sponsor_portal_state(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_anon boolean := coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
  v_email text;
  v_sr public.sponsor_registrations%rowtype;
  v_match boolean;
begin
  if v_uid is null or v_anon then return jsonb_build_object('state', 'none'); end if;

  select * into v_sr from public.sponsor_registrations where id = p_id;
  if not found then return jsonb_build_object('state', 'none'); end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  v_match := v_email is not null and v_email = lower(v_sr.contact_email);

  if v_sr.sponsor_user_id = v_uid then
    return jsonb_build_object('state',
      case v_sr.status when 'approved' then 'owner' when 'pending' then 'pending' else 'rejected' end);
  end if;
  if not v_match then return jsonb_build_object('state', 'none'); end if;

  if v_sr.status = 'pending' then return jsonb_build_object('state', 'pending'); end if;
  if v_sr.status = 'rejected' then return jsonb_build_object('state', 'rejected'); end if;
  if v_sr.sponsor_user_id is null then
    return jsonb_build_object('state', 'claimable', 'company_name', v_sr.company_name,
      'event_title', (select e.title from public.events e where e.id = v_sr.event_id));
  end if;
  return jsonb_build_object('state', 'none');
end;
$$;

create or replace function public.claim_sponsor_portal(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_sr public.sponsor_registrations%rowtype;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_sr from public.sponsor_registrations where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select lower(u.email) into v_email
  from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null or v_email <> lower(v_sr.contact_email) then raise exception 'NOT_FOUND'; end if;

  if v_sr.status <> 'approved' then raise exception 'NOT_APPROVED'; end if;
  if v_sr.sponsor_user_id is not null and v_sr.sponsor_user_id <> v_uid then raise exception 'NOT_FOUND'; end if;

  update public.sponsor_registrations set sponsor_user_id = v_uid where id = p_id;
  return jsonb_build_object('id', p_id);
end;
$$;

create or replace function public.my_sponsor_portals()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    return '[]'::jsonb;
  end if;
  select lower(u.email) into v_email
  from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'company_name', s.company_name, 'event_title', e.title,
      'tier_name', t.name, 'claimed', s.sponsor_user_id is not null)
      order by s.created_at desc)
    from public.sponsor_registrations s
    join public.events e on e.id = s.event_id
    join public.sponsorship_tiers t on t.id = s.tier_id
    where s.status = 'approved'
      and (s.sponsor_user_id = v_uid
           or (s.sponsor_user_id is null and v_email is not null and lower(s.contact_email) = v_email))
  ), '[]'::jsonb);
end;
$$;

create or replace function public.update_sponsor_profile(
  p_sponsor_id uuid,
  p_company_name text,
  p_logo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company text := btrim(coalesce(p_company_name, ''));
  v_logo text := nullif(btrim(coalesce(p_logo_url, '')), '');
begin
  if not public.is_sponsor_owner(p_sponsor_id) then raise exception 'NOT_FOUND'; end if;
  if v_company = '' or char_length(v_company) > 200 then raise exception 'INVALID_INPUT:companyName'; end if;
  if v_logo is not null and (char_length(v_logo) > 500 or v_logo !~* '^https?://[^\s]+$') then
    raise exception 'INVALID_INPUT:logoUrl';
  end if;

  update public.sponsor_registrations
  set company_name = v_company, logo_url = v_logo
  where id = p_sponsor_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attendee consent
-- ---------------------------------------------------------------------------

create or replace function public.set_sponsor_lead_consent(p_registration_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.registrations
  set sponsor_lead_consent = coalesce(p_enabled, false),
      sponsor_lead_consented_at = case when coalesce(p_enabled, false) then now() else null end
  where id = p_registration_id
    and owner_user_id = (select auth.uid());
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('enabled', coalesce(p_enabled, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- Lead capture (the only way a sponsor learns anything about an attendee)
-- ---------------------------------------------------------------------------

create or replace function public.capture_sponsor_lead(p_sponsor_id uuid, p_ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sr public.sponsor_registrations%rowtype;
  v_reg public.registrations%rowtype;
  v_lead public.sponsor_leads%rowtype;
  v_code text := upper(btrim(coalesce(p_ticket_code, '')));
  v_result text := 'captured';
begin
  if v_uid is null or not public.is_sponsor_owner(p_sponsor_id) then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_sr from public.sponsor_registrations where id = p_sponsor_id;

  select * into v_reg from public.registrations r where r.ticket_code = v_code;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if v_reg.event_id <> v_sr.event_id then return jsonb_build_object('result', 'wrong_event'); end if;
  if v_reg.status not in ('approved', 'checked_in') then return jsonb_build_object('result', 'not_active'); end if;
  if not v_reg.sponsor_lead_consent then return jsonb_build_object('result', 'no_consent'); end if;

  select * into v_lead from public.sponsor_leads
  where sponsor_registration_id = p_sponsor_id and attendee_registration_id = v_reg.id;

  if found then
    v_result := 'already_captured';
  else
    insert into public.sponsor_leads
      (event_id, sponsor_registration_id, attendee_registration_id, captured_by,
       first_name, last_name, email, company_name, job_title)
    values
      (v_sr.event_id, p_sponsor_id, v_reg.id, v_uid,
       v_reg.first_name, v_reg.last_name, v_reg.email, v_reg.company_name, v_reg.job_title)
    on conflict (sponsor_registration_id, attendee_registration_id) do nothing
    returning * into v_lead;

    if v_lead.id is null then
      select * into v_lead from public.sponsor_leads
      where sponsor_registration_id = p_sponsor_id and attendee_registration_id = v_reg.id;
      v_result := 'already_captured';
    end if;
  end if;

  return jsonb_build_object(
    'result', v_result,
    'lead', jsonb_build_object(
      'id', v_lead.id, 'first_name', v_lead.first_name, 'last_name', v_lead.last_name,
      'email', v_lead.email, 'company_name', v_lead.company_name, 'job_title', v_lead.job_title,
      'notes', v_lead.notes, 'captured_at', v_lead.captured_at));
end;
$$;

create or replace function public.update_sponsor_lead_notes(p_lead_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sponsor uuid;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  select l.sponsor_registration_id into v_sponsor from public.sponsor_leads l where l.id = p_lead_id;
  if v_sponsor is null or not public.is_sponsor_owner(v_sponsor) then raise exception 'NOT_FOUND'; end if;
  if v_notes is not null and char_length(v_notes) > 5000 then raise exception 'INVALID_INPUT:notes'; end if;

  update public.sponsor_leads set notes = v_notes where id = p_lead_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tiers: atomic reorder (invoker, RLS applies)
-- ---------------------------------------------------------------------------

create or replace function public.reorder_sponsorship_tiers(p_event_id uuid, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_event_admin(p_event_id) then raise exception 'NOT_FOUND'; end if;

  update public.sponsorship_tiers t
  set sort_order = x.ord::integer
  from unnest(p_ids) with ordinality as x(id, ord)
  where t.id = x.id and t.event_id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.is_sponsor_owner(uuid) from public, anon;
grant execute on function public.is_sponsor_owner(uuid) to authenticated;

revoke all on function public.create_sponsor_application(uuid, uuid, text, text, text, text) from public;
grant execute on function public.create_sponsor_application(uuid, uuid, text, text, text, text) to anon, authenticated;

revoke all on function public.decide_sponsor_application(uuid, text) from public, anon;
grant execute on function public.decide_sponsor_application(uuid, text) to authenticated;
revoke all on function public.sponsor_portal_state(uuid) from public, anon;
grant execute on function public.sponsor_portal_state(uuid) to authenticated;
revoke all on function public.claim_sponsor_portal(uuid) from public, anon;
grant execute on function public.claim_sponsor_portal(uuid) to authenticated;
revoke all on function public.my_sponsor_portals() from public, anon;
grant execute on function public.my_sponsor_portals() to authenticated;
revoke all on function public.update_sponsor_profile(uuid, text, text) from public, anon;
grant execute on function public.update_sponsor_profile(uuid, text, text) to authenticated;
revoke all on function public.set_sponsor_lead_consent(uuid, boolean) from public, anon;
grant execute on function public.set_sponsor_lead_consent(uuid, boolean) to authenticated;
revoke all on function public.capture_sponsor_lead(uuid, text) from public, anon;
grant execute on function public.capture_sponsor_lead(uuid, text) to authenticated;
revoke all on function public.update_sponsor_lead_notes(uuid, text) from public, anon;
grant execute on function public.update_sponsor_lead_notes(uuid, text) to authenticated;
revoke all on function public.reorder_sponsorship_tiers(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_sponsorship_tiers(uuid, uuid[]) to authenticated;
