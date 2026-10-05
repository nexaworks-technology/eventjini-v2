create type public.registration_status as enum (
  'pending',
  'approved',
  'rejected',
  'checked_in',
  'cancelled'
);

create type public.registration_field_type as enum (
  'text',
  'long_text',
  'dropdown',
  'checkbox'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_registration_fields (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  field_key text not null,
  label text not null,
  field_type public.registration_field_type not null,
  required boolean not null default false,
  options jsonb,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  unique (event_id, field_key),

  constraint registration_fields_key_format
    check (field_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint registration_fields_label_not_blank
    check (char_length(trim(label)) > 0),
  constraint registration_fields_dropdown_options
    check (
      field_type <> 'dropdown'
      or (jsonb_typeof(options) = 'array' and jsonb_array_length(options) > 0)
    )
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,

  company_name text,
  job_title text,

  custom_answers jsonb not null default '{}'::jsonb,

  status public.registration_status not null,

  ticket_code text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (event_id, owner_user_id),

  constraint registration_email_not_blank
    check (char_length(trim(email)) > 0),
  constraint registration_names_not_blank
    check (char_length(trim(first_name)) > 0 and char_length(trim(last_name)) > 0),
  constraint registration_active_has_ticket
    check (status not in ('approved', 'checked_in') or ticket_code is not null)
);

create index registrations_event_id_idx on public.registrations (event_id);
create index registrations_owner_user_id_idx on public.registrations (owner_user_id);
create index registrations_status_idx on public.registrations (event_id, status);
create index event_registration_fields_event_idx
  on public.event_registration_fields (event_id, sort_order);

create trigger registrations_set_updated_at
before update on public.registrations
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies never recurse through RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = (select auth.uid())
  );
$$;

create or replace function public.is_event_registration_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status in ('published', 'sales_open')
  );
$$;

create or replace function public.event_seats_taken(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_event_registration_open(p_event_id) then (
      select count(*)::integer
      from public.registrations r
      where r.event_id = p_event_id
        and r.status in ('approved', 'checked_in')
    )
    else 0
  end;
$$;

create or replace function public.generate_ticket_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  h text;
  code text;
begin
  loop
    -- uuid v4 chars 13 and 17 are fixed version/variant digits; skip them.
    h := replace(gen_random_uuid()::text, '-', '');
    code := 'EVJ-' || upper(substr(h, 1, 12) || substr(h, 18, 4));
    exit when not exists (
      select 1 from public.registrations r where r.ticket_code = code
    );
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.registrations enable row level security;
alter table public.event_registration_fields enable row level security;

create policy "Attendees can view own registrations"
on public.registrations
for select
to authenticated
using (owner_user_id = (select auth.uid()));

create policy "Organizers can view registrations for own events"
on public.registrations
for select
to authenticated
using (public.is_event_organizer(event_id));

-- No INSERT/UPDATE/DELETE policies on registrations: all writes go through the
-- security-definer functions below, which assign owner, status and ticket code.

create policy "Attendees can view events they registered for"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.registrations r
    where r.event_id = events.id
      and r.owner_user_id = (select auth.uid())
  )
);

create policy "Registration fields are public for open events"
on public.event_registration_fields
for select
to anon, authenticated
using (public.is_event_registration_open(event_id));

create policy "Organizers manage own registration fields"
on public.event_registration_fields
for all
to authenticated
using (public.is_event_organizer(event_id))
with check (public.is_event_organizer(event_id));

-- ---------------------------------------------------------------------------
-- Organizer: save registration settings + custom fields atomically (RLS applies)
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
    and organizer_id = (select auth.uid());
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

-- ---------------------------------------------------------------------------
-- Attendee: create a registration (validation + capacity under an event lock)
-- ---------------------------------------------------------------------------

create or replace function public.create_event_registration(
  p_event_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_company_name text,
  p_job_title text,
  p_custom_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_event public.events%rowtype;
  v_taken integer;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_company text := nullif(btrim(coalesce(p_company_name, '')), '');
  v_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_answers jsonb := coalesce(p_custom_answers, '{}'::jsonb);
  v_clean jsonb := '{}'::jsonb;
  v_status public.registration_status;
  v_code text;
  v_id uuid;
  fld record;
  v_val jsonb;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or v_event.status not in ('published', 'sales_open') then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if exists (
    select 1 from public.registrations r
    where r.event_id = p_event_id and r.owner_user_id = v_uid
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  if v_first = '' then raise exception 'INVALID_INPUT:firstName'; end if;
  if v_last = '' then raise exception 'INVALID_INPUT:lastName'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_INPUT:email';
  end if;
  if v_event.require_b2b_data then
    if v_company is null then raise exception 'INVALID_INPUT:companyName'; end if;
    if v_title is null then raise exception 'INVALID_INPUT:jobTitle'; end if;
  end if;
  if jsonb_typeof(v_answers) <> 'object' then
    raise exception 'INVALID_INPUT:answers';
  end if;

  for fld in
    select * from public.event_registration_fields
    where event_id = p_event_id
    order by sort_order
  loop
    v_val := v_answers -> fld.field_key;

    if fld.field_type in ('text', 'long_text') then
      if v_val is null or jsonb_typeof(v_val) = 'null'
         or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '') then
        if fld.required then raise exception 'FIELD_INVALID:%', fld.field_key; end if;
      elsif jsonb_typeof(v_val) <> 'string' then
        raise exception 'FIELD_INVALID:%', fld.field_key;
      else
        v_clean := v_clean || jsonb_build_object(fld.field_key, btrim(v_val #>> '{}'));
      end if;

    elsif fld.field_type = 'dropdown' then
      if v_val is null or jsonb_typeof(v_val) = 'null'
         or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '') then
        if fld.required then raise exception 'FIELD_INVALID:%', fld.field_key; end if;
      elsif jsonb_typeof(v_val) <> 'string'
         or not (fld.options @> jsonb_build_array(v_val #>> '{}')) then
        raise exception 'FIELD_INVALID:%', fld.field_key;
      else
        v_clean := v_clean || jsonb_build_object(fld.field_key, v_val #>> '{}');
      end if;

    elsif fld.field_type = 'checkbox' then
      if v_val is null or jsonb_typeof(v_val) = 'null' then
        if fld.required then raise exception 'FIELD_INVALID:%', fld.field_key; end if;
        v_clean := v_clean || jsonb_build_object(fld.field_key, false);
      elsif jsonb_typeof(v_val) <> 'boolean' then
        raise exception 'FIELD_INVALID:%', fld.field_key;
      else
        if fld.required and (v_val)::boolean is not true then
          raise exception 'FIELD_INVALID:%', fld.field_key;
        end if;
        v_clean := v_clean || jsonb_build_object(fld.field_key, (v_val)::boolean);
      end if;
    end if;
  end loop;

  select count(*) into v_taken
  from public.registrations r
  where r.event_id = p_event_id
    and r.status in ('approved', 'checked_in');

  if v_event.capacity is not null and v_taken >= v_event.capacity then
    raise exception 'SOLD_OUT';
  end if;

  if v_event.requires_approval then
    v_status := 'pending';
    v_code := null;
  else
    v_status := 'approved';
    v_code := public.generate_ticket_code();
  end if;

  begin
    insert into public.registrations (
      event_id, owner_user_id, first_name, last_name, email, phone,
      company_name, job_title, custom_answers, status, ticket_code
    )
    values (
      p_event_id, v_uid, v_first, v_last, v_email, v_phone,
      v_company, v_title, v_clean, v_status, v_code
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'ALREADY_REGISTERED';
  end;

  return jsonb_build_object(
    'registration_id', v_id,
    'status', v_status,
    'ticket_code', v_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizer: approve / reject
-- ---------------------------------------------------------------------------

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
  if v_event_id is null then raise exception 'NOT_FOUND'; end if;

  select * into v_event
  from public.events e
  where e.id = v_event_id
    and e.organizer_id = (select auth.uid())
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;

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
  if v_event_id is null or not public.is_event_organizer(v_event_id) then
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

revoke all on function public.is_event_organizer(uuid) from public, anon;
grant execute on function public.is_event_organizer(uuid) to authenticated;

revoke all on function public.is_event_registration_open(uuid) from public;
grant execute on function public.is_event_registration_open(uuid) to anon, authenticated;

revoke all on function public.event_seats_taken(uuid) from public;
grant execute on function public.event_seats_taken(uuid) to anon, authenticated;

revoke all on function public.generate_ticket_code() from public, anon, authenticated;

revoke all on function public.save_registration_form(uuid, boolean, boolean, jsonb) from public, anon;
grant execute on function public.save_registration_form(uuid, boolean, boolean, jsonb) to authenticated;

revoke all on function public.create_event_registration(uuid, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_event_registration(uuid, text, text, text, text, text, text, jsonb) to authenticated;

revoke all on function public.approve_event_registration(uuid) from public, anon;
grant execute on function public.approve_event_registration(uuid) to authenticated;

revoke all on function public.reject_event_registration(uuid) from public, anon;
grant execute on function public.reject_event_registration(uuid) to authenticated;
