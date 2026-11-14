-- Organizations (like Supabase): a user can create or join several; every event belongs to one.
-- Org owner = owner of every event; org admin/member = admin of every event.
-- Per-event teams (event_members) still work for people outside the organization.

create type public.org_role as enum ('owner', 'admin', 'member');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint organizations_logo_length check (logo_url is null or char_length(logo_url) <= 1000)
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);
-- Exactly one owner per organization.
create unique index organization_members_one_owner_idx on public.organization_members (organization_id) where role = 'owner';

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  status public.event_invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_invites_email_not_blank check (char_length(trim(email)) > 0),
  constraint organization_invites_not_owner check (role <> 'owner')
);
create unique index organization_invites_one_pending_idx
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Events belong to an organization. Existing organizers get a personal one.
-- ---------------------------------------------------------------------------

alter table public.events add column organization_id uuid references public.organizations(id) on delete restrict;

do $$
declare
  r record;
  v_org uuid;
begin
  for r in
    select distinct e.organizer_id as uid,
           coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'My') as label
    from public.events e
    join auth.users u on u.id = e.organizer_id
    left join public.profiles p on p.id = e.organizer_id
  loop
    insert into public.organizations (name, created_by)
    values (left(r.label || '''s organization', 80), r.uid)
    returning id into v_org;
    insert into public.organization_members (organization_id, user_id, role) values (v_org, r.uid, 'owner');
    update public.events set organization_id = v_org where organizer_id = r.uid;
  end loop;
end;
$$;

alter table public.events alter column organization_id set not null;
create index events_organization_id_idx on public.events (organization_id);

-- Neither the creator nor the organization of an event can change.
create or replace function public.prevent_organizer_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organizer_id <> old.organizer_id then
    raise exception 'ORGANIZER_IMMUTABLE';
  end if;
  if new.organization_id <> old.organization_id then
    raise exception 'ORGANIZATION_IMMUTABLE';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then null
    else (
      select m.role::text from public.organization_members m
      where m.organization_id = p_org_id and m.user_id = (select auth.uid())
    )
  end;
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.org_role(p_org_id) is not null; $$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.org_role(p_org_id) in ('owner', 'admin'), false); $$;

-- Every event policy resolves through this, so organization access flows everywhere.
-- The creator stays owner only while still in the organization.
create or replace function public.event_role(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then null
    else (
      select case
        when om.role = 'owner' then 'owner'
        when om.role is not null and e.organizer_id = (select auth.uid()) then 'owner'
        when om.role is not null then 'admin'
        else (
          select m.role::text from public.event_members m
          where m.event_id = e.id and m.user_id = (select auth.uid())
        )
      end
      from public.events e
      left join public.organization_members om
        on om.organization_id = e.organization_id and om.user_id = (select auth.uid())
      where e.id = p_event_id
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Owner-only event policies are replaced by organization access (via event_role).
drop policy "Organizers can view own events" on public.events;
drop policy "Organizers can update own events" on public.events;
drop policy "Organizers can create own events" on public.events;

create policy "Organization admins can create events"
on public.events for insert to authenticated
with check (organizer_id = (select auth.uid()) and public.is_org_admin(organization_id));

-- Checked against the row itself (not a lookup), so INSERT ... RETURNING can see the new event.
create policy "Creators can view their events while in the organization"
on public.events for select to authenticated
using (organizer_id = (select auth.uid()) and public.is_org_member(organization_id));

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

create policy "Members can view their organizations"
on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy "Admins can update organizations"
on public.organizations for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- Refused by the events foreign key while the organization still has events.
create policy "Owners can delete organizations"
on public.organizations for delete to authenticated
using (public.org_role(id) = 'owner');

revoke insert, update on public.organizations from anon, authenticated;
grant update (name, logo_url) on public.organizations to authenticated;

create policy "Members can view membership"
on public.organization_members for select to authenticated
using (public.is_org_member(organization_id));

-- Membership changes only through the functions below.
revoke insert, update, delete on public.organization_members from anon, authenticated;

create policy "Admins can view organization invites"
on public.organization_invites for select to authenticated
using (public.is_org_admin(organization_id));

create policy "Admins can create organization invites"
on public.organization_invites for insert to authenticated
with check (public.is_org_admin(organization_id) and invited_by = (select auth.uid()));

create policy "Admins can update organization invites"
on public.organization_invites for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if (select count(*) from public.organizations where created_by = v_uid) >= 10 then
    raise exception 'ORG_LIMIT';
  end if;
  insert into public.organizations (name, created_by) values (btrim(p_name), v_uid) returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role) values (v_org, v_uid, 'owner');
  return v_org;
end;
$$;

-- Members list with emails (emails live in auth.users). Any member can see it.
create or replace function public.organization_team(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'NOT_FOUND';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'member_id', m.id, 'user_id', m.user_id, 'email', u.email::text,
      'full_name', p.full_name, 'role', m.role::text, 'created_at', m.created_at
    ) order by (m.role = 'owner') desc, m.created_at)
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_org_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.set_organization_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.organization_members%rowtype;
begin
  if p_role not in ('admin', 'member') then raise exception 'INVALID_ROLE'; end if;
  select * into v_member from public.organization_members where id = p_member_id for update;
  if not found or not public.is_org_admin(v_member.organization_id) then raise exception 'NOT_FOUND'; end if;
  if v_member.role = 'owner' then raise exception 'OWNER_IMMUTABLE'; end if;
  update public.organization_members set role = p_role::public.org_role where id = p_member_id;
end;
$$;

-- Admins remove others; anyone but the owner can leave.
create or replace function public.remove_organization_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.organization_members%rowtype;
begin
  select * into v_member from public.organization_members where id = p_member_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_member.user_id <> (select auth.uid()) and not public.is_org_admin(v_member.organization_id) then
    raise exception 'NOT_FOUND';
  end if;
  if v_member.role = 'owner' then raise exception 'OWNER_IMMUTABLE'; end if;
  delete from public.organization_members where id = p_member_id;
end;
$$;

create or replace function public.organization_invite_preview(p_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status::text end,
    'organization_name', o.name,
    'role', i.role::text,
    'email', i.email
  )
  from public.organization_invites i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = p_token_hash;
$$;

create or replace function public.accept_organization_invite(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.organization_invites%rowtype;
begin
  if v_uid is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_inv from public.organization_invites where token_hash = p_token_hash for update;
  if not found or v_inv.status in ('revoked', 'expired') then raise exception 'INVITE_INVALID'; end if;
  if v_inv.status = 'accepted' then raise exception 'INVITE_USED'; end if;
  if v_inv.expires_at <= now() then raise exception 'INVITE_EXPIRED'; end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null or v_email <> lower(v_inv.email) then raise exception 'EMAIL_MISMATCH'; end if;

  -- Never downgrade the owner; otherwise the invite sets the role.
  insert into public.organization_members (organization_id, user_id, role)
  values (v_inv.organization_id, v_uid, v_inv.role)
  on conflict (organization_id, user_id) do update
    set role = case when public.organization_members.role = 'owner' then 'owner'::public.org_role else excluded.role end;

  update public.organization_invites set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return jsonb_build_object('organization_id', v_inv.organization_id);
end;
$$;

-- Logos live next to event assets: orgs/<organization id>/logo/<file>.
create or replace function public.can_manage_event_asset(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_name ~ '^events/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(cover|speakers)/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$' then
    return public.is_event_admin(split_part(p_name, '/', 2)::uuid);
  end if;
  if p_name ~ '^orgs/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$' then
    return public.is_org_admin(split_part(p_name, '/', 2)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.org_role(uuid) from public, anon;
grant execute on function public.org_role(uuid) to authenticated;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
revoke all on function public.organization_team(uuid) from public, anon;
grant execute on function public.organization_team(uuid) to authenticated;
revoke all on function public.set_organization_member_role(uuid, text) from public, anon;
grant execute on function public.set_organization_member_role(uuid, text) to authenticated;
revoke all on function public.remove_organization_member(uuid) from public, anon;
grant execute on function public.remove_organization_member(uuid) to authenticated;
revoke all on function public.organization_invite_preview(text) from public;
grant execute on function public.organization_invite_preview(text) to anon, authenticated;
revoke all on function public.accept_organization_invite(text) from public, anon;
grant execute on function public.accept_organization_invite(text) to authenticated;

notify pgrst, 'reload schema';
