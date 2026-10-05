create type public.event_member_role as enum ('admin', 'scanner', 'viewer');
create type public.event_invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.event_task_status as enum ('todo', 'in_progress', 'done');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.event_member_role not null,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  role public.event_member_role not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  status public.event_invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_invites_email_not_blank check (char_length(trim(email)) > 0)
);

create unique index event_invites_one_pending_idx
  on public.event_invites (event_id, lower(email))
  where status = 'pending';

create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  speaker text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_sessions_title_not_blank check (char_length(trim(title)) > 0),
  constraint event_sessions_end_after_start check (end_at > start_at)
);

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  status public.event_task_status not null default 'todo',
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_tasks_title_not_blank check (char_length(trim(title)) > 0)
);

alter table public.registrations
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references auth.users(id) on delete set null;

create table public.event_check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  checked_in_by uuid not null references auth.users(id),
  method text not null check (method in ('qr', 'manual')),
  created_at timestamptz not null default now()
);

create unique index event_check_ins_one_per_registration_idx
  on public.event_check_ins (registration_id);

create index event_members_user_idx on public.event_members (user_id);
create index event_members_event_idx on public.event_members (event_id);
create index event_invites_event_idx on public.event_invites (event_id);
create index event_sessions_event_idx on public.event_sessions (event_id, start_at);
create index event_tasks_event_idx on public.event_tasks (event_id, status, sort_order);
create index event_check_ins_event_idx on public.event_check_ins (event_id);

create trigger event_sessions_set_updated_at
before update on public.event_sessions
for each row execute procedure public.set_updated_at();

create trigger event_tasks_set_updated_at
before update on public.event_tasks
for each row execute procedure public.set_updated_at();

-- Ownership can never move, so an admin cannot take an event over.
create or replace function public.prevent_organizer_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organizer_id <> old.organizer_id then
    raise exception 'ORGANIZER_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger events_organizer_immutable
before update on public.events
for each row execute procedure public.prevent_organizer_change();

-- ---------------------------------------------------------------------------
-- Access helpers: every policy and function resolves access through these.
-- Anonymous guest sessions never have an event role.
-- ---------------------------------------------------------------------------

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
    when exists (
      select 1 from public.events e
      where e.id = p_event_id and e.organizer_id = (select auth.uid())
    ) then 'owner'
    else (
      select m.role::text from public.event_members m
      where m.event_id = p_event_id and m.user_id = (select auth.uid())
    )
  end;
$$;

create or replace function public.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.event_role(p_event_id) is not null; $$;

create or replace function public.is_event_admin(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.event_role(p_event_id) in ('owner', 'admin'), false); $$;

create or replace function public.can_check_in(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.event_role(p_event_id) in ('owner', 'admin', 'scanner'), false); $$;

create or replace function public.can_view_tasks(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.event_role(p_event_id) in ('owner', 'admin', 'viewer'), false); $$;

create or replace function public.is_event_published(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e where e.id = p_event_id and e.status = 'published'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_members enable row level security;
alter table public.event_invites enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_tasks enable row level security;
alter table public.event_check_ins enable row level security;

-- events: team members can read; admins can edit (owner policies already exist)
create policy "Team members can view events"
on public.events for select to authenticated
using (public.can_access_event(id));

create policy "Admins can update events"
on public.events for update to authenticated
using (public.is_event_admin(id))
with check (public.is_event_admin(id));

-- P2 tables: widen owner-only access to owner + admin
drop policy "Organizers can view registrations for own events" on public.registrations;
create policy "Event admins can view registrations"
on public.registrations for select to authenticated
using (public.is_event_admin(event_id));

drop policy "Organizers manage own registration fields" on public.event_registration_fields;
create policy "Event admins manage registration fields"
on public.event_registration_fields for all to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

-- members (rows are created only by accept_event_invite)
create policy "Admins and the member can view membership"
on public.event_members for select to authenticated
using (public.is_event_admin(event_id) or user_id = (select auth.uid()));

create policy "Admins can change member roles"
on public.event_members for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can remove members"
on public.event_members for delete to authenticated
using (public.is_event_admin(event_id));

-- invites
create policy "Admins can view invites"
on public.event_invites for select to authenticated
using (public.is_event_admin(event_id));

create policy "Admins can create invites"
on public.event_invites for insert to authenticated
with check (public.is_event_admin(event_id) and invited_by = (select auth.uid()));

create policy "Admins can update invites"
on public.event_invites for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete invites"
on public.event_invites for delete to authenticated
using (public.is_event_admin(event_id));

-- agenda: team reads, public reads published events, admins write
create policy "Agenda is readable by team and for published events"
on public.event_sessions for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));

create policy "Admins can add sessions"
on public.event_sessions for insert to authenticated
with check (public.is_event_admin(event_id));

create policy "Admins can edit sessions"
on public.event_sessions for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete sessions"
on public.event_sessions for delete to authenticated
using (public.is_event_admin(event_id));

-- tasks: owner/admin/viewer read, owner/admin write, scanner none
create policy "Owner admin and viewer can read tasks"
on public.event_tasks for select to authenticated
using (public.can_view_tasks(event_id));

create policy "Admins can add tasks"
on public.event_tasks for insert to authenticated
with check (public.is_event_admin(event_id) and created_by = (select auth.uid()));

create policy "Admins can edit tasks"
on public.event_tasks for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete tasks"
on public.event_tasks for delete to authenticated
using (public.is_event_admin(event_id));

-- check-ins: audit rows readable by admins; written only by check_in_ticket()
create policy "Admins can view check-ins"
on public.event_check_ins for select to authenticated
using (public.is_event_admin(event_id));

-- ---------------------------------------------------------------------------
-- Team directory (emails live in auth.users, so this is definer + admin only)
-- ---------------------------------------------------------------------------

create or replace function public.event_team(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_event_admin(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.is_owner desc, t.created_at)
    from (
      select e.organizer_id as user_id, u.email::text as email, p.full_name,
             'owner'::text as role, true as is_owner, null::uuid as member_id,
             e.created_at
      from public.events e
      join auth.users u on u.id = e.organizer_id
      left join public.profiles p on p.id = e.organizer_id
      where e.id = p_event_id
      union all
      select m.user_id, u.email::text, p.full_name, m.role::text, false, m.id, m.created_at
      from public.event_members m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
      where m.event_id = p_event_id
    ) t
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Invites: preview (public, token-hash lookup) and accept
-- ---------------------------------------------------------------------------

create or replace function public.invite_preview(p_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', case when i.status = 'pending' and i.expires_at <= now()
                   then 'expired' else i.status::text end,
    'event_title', e.title,
    'role', i.role::text,
    'email', i.email
  )
  from public.event_invites i
  join public.events e on e.id = i.event_id
  where i.token_hash = p_token_hash;
$$;

create or replace function public.accept_event_invite(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.event_invites%rowtype;
begin
  if v_uid is null
     or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_inv from public.event_invites
  where token_hash = p_token_hash
  for update;

  if not found or v_inv.status in ('revoked', 'expired') then
    raise exception 'INVITE_INVALID';
  end if;
  if v_inv.status = 'accepted' then raise exception 'INVITE_USED'; end if;
  if v_inv.expires_at <= now() then raise exception 'INVITE_EXPIRED'; end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null or v_email <> lower(v_inv.email) then
    raise exception 'EMAIL_MISMATCH';
  end if;

  if exists (
    select 1 from public.events e
    where e.id = v_inv.event_id and e.organizer_id = v_uid
  ) then
    raise exception 'ALREADY_OWNER';
  end if;

  insert into public.event_members (event_id, user_id, role, invited_by)
  values (v_inv.event_id, v_uid, v_inv.role, v_inv.invited_by)
  on conflict (event_id, user_id) do update set role = excluded.role;

  update public.event_invites
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;

  return jsonb_build_object('event_id', v_inv.event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Check-in (transactional; scanners never read the registrations table)
-- ---------------------------------------------------------------------------

create or replace function public.check_in_ticket(
  p_event_id uuid,
  p_ticket_code text,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_ticket_code, '')));
  v_method text := case when p_method = 'qr' then 'qr' else 'manual' end;
  v_reg public.registrations%rowtype;
  v_now timestamptz := now();
  v_event_title text;
begin
  if v_uid is null or not public.can_check_in(p_event_id) then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_reg from public.registrations r
  where r.ticket_code = v_code
  for update;

  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_reg.event_id <> p_event_id then
    return jsonb_build_object('result', 'wrong_event');
  end if;

  select e.title into v_event_title from public.events e where e.id = p_event_id;

  if v_reg.status = 'checked_in' then
    return jsonb_build_object(
      'result', 'already_checked_in',
      'first_name', v_reg.first_name, 'last_name', v_reg.last_name,
      'company_name', v_reg.company_name, 'checked_in_at', v_reg.checked_in_at,
      'event_title', v_event_title);
  end if;
  if v_reg.status = 'cancelled' then
    return jsonb_build_object('result', 'cancelled');
  end if;
  if v_reg.status <> 'approved' then
    return jsonb_build_object('result', 'not_approved');
  end if;

  update public.registrations
  set status = 'checked_in', checked_in_at = v_now, checked_in_by = v_uid
  where id = v_reg.id;

  insert into public.event_check_ins (event_id, registration_id, checked_in_by, method)
  values (p_event_id, v_reg.id, v_uid, v_method);

  return jsonb_build_object(
    'result', 'success',
    'first_name', v_reg.first_name, 'last_name', v_reg.last_name,
    'company_name', v_reg.company_name, 'checked_in_at', v_now,
    'event_title', v_event_title);
end;
$$;

-- Minimal-identity lookup for manual check-in: no phone, email or answers returned.
create or replace function public.search_checkin_guests(p_event_id uuid, p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
begin
  if not public.can_check_in(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;
  if char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'first_name', r.first_name, 'last_name', r.last_name,
      'company_name', r.company_name, 'status', r.status::text,
      'ticket_code', r.ticket_code) order by r.first_name, r.last_name)
    from (
      select * from public.registrations x
      where x.event_id = p_event_id
        and x.status in ('approved', 'checked_in')
        and x.ticket_code is not null
        and (
          position(q in lower(x.first_name || ' ' || x.last_name)) > 0
          or position(q in lower(x.email)) > 0
          or position(q in lower(x.ticket_code)) > 0
          or position(q in lower(coalesce(x.company_name, ''))) > 0
        )
      order by x.first_name, x.last_name
      limit 10
    ) r
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Tasks: atomic reorder / move (invoker, so RLS applies)
-- ---------------------------------------------------------------------------

create or replace function public.reorder_event_tasks(p_event_id uuid, p_updates jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_event_admin(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  update public.event_tasks t
  set status = x.status::public.event_task_status,
      sort_order = x.sort_order
  from jsonb_to_recordset(p_updates) as x(id uuid, status text, sort_order integer)
  where t.id = x.id and t.event_id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- P2 functions widened from owner-only to owner + admin
-- ---------------------------------------------------------------------------

create or replace function public.save_registration_form(
  p_event_id uuid,
  p_requires_approval boolean,
  p_require_b2b_data boolean,
  p_fields jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  f jsonb;
  ord bigint;
  keys text[];
  updated integer;
begin
  update public.events
  set requires_approval = p_requires_approval,
      require_b2b_data = p_require_b2b_data
  where id = p_event_id
    and public.is_event_admin(p_event_id);
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'NOT_FOUND';
  end if;

  select coalesce(array_agg(x ->> 'field_key'), '{}')
  into keys
  from jsonb_array_elements(p_fields) x;

  delete from public.event_registration_fields
  where event_id = p_event_id
    and not (field_key = any (keys));

  for f, ord in
    select value, ordinality from jsonb_array_elements(p_fields) with ordinality
  loop
    insert into public.event_registration_fields
      (event_id, field_key, label, field_type, required, options, sort_order)
    values (
      p_event_id,
      f ->> 'field_key',
      f ->> 'label',
      (f ->> 'field_type')::public.registration_field_type,
      coalesce((f ->> 'required')::boolean, false),
      nullif(f -> 'options', 'null'::jsonb),
      ord::integer
    )
    on conflict (event_id, field_key) do update
    set label = excluded.label,
        field_type = excluded.field_type,
        required = excluded.required,
        options = excluded.options,
        sort_order = excluded.sort_order;
  end loop;
end;
$$;

create or replace function public.approve_event_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event public.events%rowtype;
  v_reg public.registrations%rowtype;
  v_taken integer;
  v_code text;
begin
  select r.event_id into v_event_id
  from public.registrations r
  where r.id = p_registration_id;
  if v_event_id is null or not public.is_event_admin(v_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_event from public.events e where e.id = v_event_id for update;

  select * into v_reg
  from public.registrations r
  where r.id = p_registration_id
  for update;
  if v_reg.status <> 'pending' then raise exception 'NOT_PENDING'; end if;

  select count(*) into v_taken
  from public.registrations r
  where r.event_id = v_event_id
    and r.status in ('approved', 'checked_in');
  if v_event.capacity is not null and v_taken >= v_event.capacity then
    raise exception 'SOLD_OUT';
  end if;

  v_code := public.generate_ticket_code();
  update public.registrations
  set status = 'approved', ticket_code = v_code
  where id = p_registration_id;

  return jsonb_build_object(
    'registration_id', p_registration_id,
    'status', 'approved',
    'ticket_code', v_code
  );
end;
$$;

create or replace function public.reject_event_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_reg public.registrations%rowtype;
begin
  select r.event_id into v_event_id
  from public.registrations r
  where r.id = p_registration_id;
  if v_event_id is null or not public.is_event_admin(v_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_reg
  from public.registrations r
  where r.id = p_registration_id
  for update;
  if v_reg.status <> 'pending' then raise exception 'NOT_PENDING'; end if;

  update public.registrations
  set status = 'rejected'
  where id = p_registration_id;

  return jsonb_build_object('registration_id', p_registration_id, 'status', 'rejected');
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.event_role(uuid) from public;
grant execute on function public.event_role(uuid) to anon, authenticated;
revoke all on function public.can_access_event(uuid) from public;
grant execute on function public.can_access_event(uuid) to anon, authenticated;
revoke all on function public.is_event_published(uuid) from public;
grant execute on function public.is_event_published(uuid) to anon, authenticated;

revoke all on function public.is_event_admin(uuid) from public, anon;
grant execute on function public.is_event_admin(uuid) to authenticated;
revoke all on function public.can_check_in(uuid) from public, anon;
grant execute on function public.can_check_in(uuid) to authenticated;
revoke all on function public.can_view_tasks(uuid) from public, anon;
grant execute on function public.can_view_tasks(uuid) to authenticated;

revoke all on function public.event_team(uuid) from public, anon;
grant execute on function public.event_team(uuid) to authenticated;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
revoke all on function public.accept_event_invite(text) from public, anon;
grant execute on function public.accept_event_invite(text) to authenticated;

revoke all on function public.check_in_ticket(uuid, text, text) from public, anon;
grant execute on function public.check_in_ticket(uuid, text, text) to authenticated;
revoke all on function public.search_checkin_guests(uuid, text) from public, anon;
grant execute on function public.search_checkin_guests(uuid, text) to authenticated;
revoke all on function public.reorder_event_tasks(uuid, jsonb) from public, anon;
grant execute on function public.reorder_event_tasks(uuid, jsonb) to authenticated;

revoke all on function public.save_registration_form(uuid, boolean, boolean, jsonb) from public, anon;
grant execute on function public.save_registration_form(uuid, boolean, boolean, jsonb) to authenticated;
revoke all on function public.approve_event_registration(uuid) from public, anon;
grant execute on function public.approve_event_registration(uuid) to authenticated;
revoke all on function public.reject_event_registration(uuid) from public, anon;
grant execute on function public.reject_event_registration(uuid) to authenticated;
