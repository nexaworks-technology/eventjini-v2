create type public.broadcast_status as enum (
  'draft', 'queued', 'sending', 'sent', 'partial_failed', 'failed'
);

create type public.email_delivery_status as enum (
  'queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed'
);

create type public.automation_trigger_type as enum (
  'registration_approved', 'event_start_24h'
);

create type public.automation_action_type as enum ('send_email');

create type public.automation_run_status as enum (
  'queued', 'processing', 'succeeded', 'failed', 'skipped'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  request_id uuid not null,
  segment public.registration_status not null,
  subject text not null,
  body_text text not null,
  status public.broadcast_status not null default 'draft',
  recipient_count integer not null default 0,
  queued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, request_id),
  constraint broadcast_segment_allowed check (segment in ('approved', 'pending', 'checked_in')),
  constraint broadcast_subject_not_blank check (char_length(trim(subject)) > 0),
  constraint broadcast_body_not_blank check (char_length(trim(body_text)) > 0)
);

create table public.event_automations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  trigger_type public.automation_trigger_type not null,
  action_type public.automation_action_type not null default 'send_email',
  subject text not null,
  body_text text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_name_not_blank check (char_length(trim(name)) > 0),
  constraint automation_subject_not_blank check (char_length(trim(subject)) > 0),
  constraint automation_body_not_blank check (char_length(trim(body_text)) > 0)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.event_automations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  trigger_key text not null,
  status public.automation_run_status not null default 'queued',
  qualified_at timestamptz not null default now(),
  executed_at timestamptz,
  result text,
  created_at timestamptz not null default now(),
  unique (automation_id, trigger_key)
);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  broadcast_id uuid references public.event_broadcasts(id) on delete cascade,
  automation_run_id uuid references public.automation_runs(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  status public.email_delivery_status not null default 'queued',
  provider_message_id text unique,
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  created_at timestamptz not null default now(),
  constraint delivery_has_origin check (broadcast_id is not null or automation_run_id is not null)
);

create unique index email_deliveries_one_per_broadcast_recipient
  on public.email_deliveries (broadcast_id, registration_id)
  where broadcast_id is not null;

create unique index email_deliveries_one_per_run
  on public.email_deliveries (automation_run_id)
  where automation_run_id is not null;

create table public.event_page_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  visitor_id uuid not null,
  path text not null,
  source text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  viewed_at timestamptz not null default now()
);

create table public.registration_attribution (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  visitor_id uuid,
  first_touch jsonb,
  last_touch jsonb,
  converted_at timestamptz not null default now()
);

create index event_broadcasts_event_idx on public.event_broadcasts (event_id, created_at desc);
create index email_deliveries_event_idx on public.email_deliveries (event_id);
create index email_deliveries_broadcast_idx on public.email_deliveries (broadcast_id, status);
create index email_deliveries_due_idx on public.email_deliveries (status, scheduled_for);
create index event_automations_event_idx on public.event_automations (event_id);
create index automation_runs_automation_idx on public.automation_runs (automation_id, created_at desc);
create index event_page_views_event_time_idx on public.event_page_views (event_id, viewed_at);
create index event_page_views_event_source_idx on public.event_page_views (event_id, source);
create index event_page_views_event_visitor_idx on public.event_page_views (event_id, visitor_id);
create index registration_attribution_event_idx on public.registration_attribution (event_id);

create trigger event_broadcasts_set_updated_at
before update on public.event_broadcasts
for each row execute procedure public.set_updated_at();

create trigger event_automations_set_updated_at
before update on public.event_automations
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helper (analytics: owner / admin / viewer)
-- ---------------------------------------------------------------------------

create or replace function public.can_view_analytics(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.event_role(p_event_id) in ('owner', 'admin', 'viewer'), false); $$;

-- ---------------------------------------------------------------------------
-- RLS. Browser sessions can read (owner/admin, analytics also viewer) and
-- manage automations; every other write is made by definer functions or by the
-- server-side service role (worker, webhook, tracking endpoint).
-- ---------------------------------------------------------------------------

alter table public.event_broadcasts enable row level security;
alter table public.event_automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.event_page_views enable row level security;
alter table public.registration_attribution enable row level security;

create policy "Admins can view broadcasts"
on public.event_broadcasts for select to authenticated
using (public.is_event_admin(event_id));

create policy "Admins can view automations"
on public.event_automations for select to authenticated
using (public.is_event_admin(event_id));

create policy "Admins can create automations"
on public.event_automations for insert to authenticated
with check (public.is_event_admin(event_id) and created_by = (select auth.uid()));

create policy "Admins can update automations"
on public.event_automations for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete automations"
on public.event_automations for delete to authenticated
using (public.is_event_admin(event_id));

create policy "Admins can view automation runs"
on public.automation_runs for select to authenticated
using (public.is_event_admin(event_id));

create policy "Admins can view email deliveries"
on public.email_deliveries for select to authenticated
using (public.is_event_admin(event_id));

create policy "Analytics roles can view page views"
on public.event_page_views for select to authenticated
using (public.can_view_analytics(event_id));

create policy "Analytics roles can view attribution"
on public.registration_attribution for select to authenticated
using (public.can_view_analytics(event_id));

-- ---------------------------------------------------------------------------
-- Template validation shared by broadcasts
-- ---------------------------------------------------------------------------

create or replace function public.template_unknown_variable(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select m[1]
  from regexp_matches(coalesce(p_text, ''), '\{\{\s*([A-Za-z0-9_]*)\s*\}\}', 'g') as m
  where m[1] not in ('first_name', 'event_title', 'event_date', 'event_location')
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Broadcasts: atomic recipient snapshot + queue (idempotent per request_id)
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_recipient_count(
  p_event_id uuid,
  p_segment public.registration_status
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_event_admin(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;
  return (
    select count(*)::integer from public.registrations r
    where r.event_id = p_event_id and r.status = p_segment
  );
end;
$$;

create or replace function public.queue_broadcast(
  p_event_id uuid,
  p_request_id uuid,
  p_segment public.registration_status,
  p_subject text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_unknown text;
  v_count integer;
  v_id uuid;
  v_existing public.event_broadcasts%rowtype;
begin
  if v_uid is null or not public.is_event_admin(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_existing from public.event_broadcasts
  where event_id = p_event_id and request_id = p_request_id;
  if found then
    return jsonb_build_object('broadcast_id', v_existing.id,
      'recipient_count', v_existing.recipient_count, 'duplicate', true);
  end if;

  if p_segment not in ('approved', 'pending', 'checked_in') then
    raise exception 'INVALID_SEGMENT';
  end if;
  if v_subject = '' or char_length(v_subject) > 200 then raise exception 'INVALID_SUBJECT'; end if;
  if v_body = '' or char_length(v_body) > 10000 then raise exception 'INVALID_BODY'; end if;

  v_unknown := coalesce(public.template_unknown_variable(v_subject),
                        public.template_unknown_variable(v_body));
  if v_unknown is not null then
    raise exception 'UNKNOWN_VARIABLE:%', v_unknown;
  end if;

  select count(*)::integer into v_count
  from public.registrations r
  where r.event_id = p_event_id and r.status = p_segment;
  if v_count = 0 then raise exception 'NO_RECIPIENTS'; end if;

  begin
    insert into public.event_broadcasts
      (event_id, created_by, request_id, segment, subject, body_text, status, recipient_count, queued_at)
    values
      (p_event_id, v_uid, p_request_id, p_segment, v_subject, v_body, 'queued', v_count, now())
    returning id into v_id;
  exception when unique_violation then
    select * into v_existing from public.event_broadcasts
    where event_id = p_event_id and request_id = p_request_id;
    return jsonb_build_object('broadcast_id', v_existing.id,
      'recipient_count', v_existing.recipient_count, 'duplicate', true);
  end;

  insert into public.email_deliveries
    (event_id, broadcast_id, registration_id, recipient_email, subject, body_text)
  select p_event_id, v_id, r.id, r.email, v_subject, v_body
  from public.registrations r
  where r.event_id = p_event_id and r.status = p_segment
  on conflict do nothing;

  return jsonb_build_object('broadcast_id', v_id, 'recipient_count', v_count, 'duplicate', false);
end;
$$;

create or replace function public.retry_failed_deliveries(p_broadcast_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_n integer;
begin
  select b.event_id into v_event_id from public.event_broadcasts b where b.id = p_broadcast_id;
  if v_event_id is null or not public.is_event_admin(v_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  update public.email_deliveries
  set status = 'queued', attempts = 0, last_error = null, scheduled_for = now()
  where broadcast_id = p_broadcast_id and status = 'failed';
  get diagnostics v_n = row_count;

  if v_n > 0 then
    update public.event_broadcasts set status = 'sending' where id = p_broadcast_id;
  end if;
  return v_n;
end;
$$;

-- Internal: recompute a broadcast's status from its deliveries.
create or replace function public.refresh_broadcast_status(p_broadcast_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_open integer;
  v_failed integer;
  v_total integer;
begin
  select count(*) filter (where status in ('queued', 'sending')),
         count(*) filter (where status = 'failed'),
         count(*)
  into v_open, v_failed, v_total
  from public.email_deliveries where broadcast_id = p_broadcast_id;

  if v_total = 0 then return; end if;

  if v_open > 0 then
    update public.event_broadcasts set status = 'sending'
    where id = p_broadcast_id and status in ('queued', 'sending', 'partial_failed', 'failed');
  elsif v_failed = 0 then
    update public.event_broadcasts set status = 'sent', sent_at = coalesce(sent_at, now())
    where id = p_broadcast_id;
  elsif v_failed = v_total then
    update public.event_broadcasts set status = 'failed' where id = p_broadcast_id;
  else
    update public.event_broadcasts set status = 'partial_failed', sent_at = coalesce(sent_at, now())
    where id = p_broadcast_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker functions (service role only)
-- ---------------------------------------------------------------------------

create or replace function public.claim_email_deliveries(p_limit integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select d.id
    from public.email_deliveries d
    where d.attempts < 3
      and (
        (d.status = 'queued' and d.scheduled_for <= now())
        or (d.status = 'sending' and d.claimed_at < now() - interval '10 minutes')
      )
    order by d.scheduled_for
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update skip locked
  ),
  upd as (
    update public.email_deliveries d
    set status = 'sending', attempts = d.attempts + 1, claimed_at = now()
    from picked
    where d.id = picked.id
    returning d.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'recipient_email', u.recipient_email,
    'subject', u.subject,
    'body_text', u.body_text,
    'first_name', r.first_name,
    'event_title', e.title,
    'event_start_at', e.start_at,
    'event_end_at', e.end_at,
    'event_timezone', e.timezone,
    'event_location', e.location
  )), '[]'::jsonb)
  from upd u
  join public.registrations r on r.id = u.registration_id
  join public.events e on e.id = u.event_id;
$$;

create or replace function public.finish_email_delivery(
  p_id uuid,
  p_provider_message_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.email_deliveries%rowtype;
begin
  select * into d from public.email_deliveries where id = p_id for update;
  if not found then return; end if;

  if p_error is null then
    update public.email_deliveries
    set status = 'sent', provider_message_id = p_provider_message_id,
        sent_at = now(), last_error = null
    where id = p_id;
    if d.automation_run_id is not null then
      update public.automation_runs
      set status = 'succeeded', executed_at = now(), result = 'Email accepted by provider'
      where id = d.automation_run_id;
    end if;
  elsif d.attempts < 3 then
    update public.email_deliveries
    set status = 'queued', last_error = left(p_error, 300),
        scheduled_for = now() + (d.attempts * interval '5 minutes')
    where id = p_id;
  else
    update public.email_deliveries
    set status = 'failed', last_error = left(p_error, 300)
    where id = p_id;
    if d.automation_run_id is not null then
      update public.automation_runs
      set status = 'failed', executed_at = now(), result = left(p_error, 300)
      where id = d.automation_run_id;
    end if;
  end if;

  if d.broadcast_id is not null then
    perform public.refresh_broadcast_status(d.broadcast_id);
  end if;
end;
$$;

create or replace function public.apply_email_event(
  p_provider_message_id text,
  p_event text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.email_deliveries%rowtype;
  v_target public.email_delivery_status;
begin
  v_target := case p_event
    when 'email.delivered' then 'delivered'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.failed' then 'failed'
    else null end;
  if v_target is null then
    return jsonb_build_object('updated', false, 'reason', 'ignored_event');
  end if;

  select * into d from public.email_deliveries
  where provider_message_id = p_provider_message_id for update;
  if not found then
    return jsonb_build_object('updated', false, 'reason', 'unknown_message');
  end if;
  if d.status = v_target then
    return jsonb_build_object('updated', false, 'reason', 'duplicate');
  end if;

  -- delivered may only follow sent; bounce/complaint/failure may follow sent or delivered
  if v_target = 'delivered' and d.status <> 'sent' then
    return jsonb_build_object('updated', false, 'reason', 'out_of_order');
  end if;
  if v_target <> 'delivered' and d.status not in ('sent', 'delivered') then
    return jsonb_build_object('updated', false, 'reason', 'out_of_order');
  end if;

  update public.email_deliveries
  set status = v_target,
      delivered_at = case when v_target = 'delivered' then coalesce(p_at, now()) else delivered_at end,
      bounced_at = case when v_target = 'bounced' then coalesce(p_at, now()) else bounced_at end,
      last_error = case when v_target in ('bounced', 'complained', 'failed')
                        then 'Provider reported: ' || p_event else last_error end
  where id = d.id;

  return jsonb_build_object('updated', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Automations
-- ---------------------------------------------------------------------------

create or replace function public.queue_approval_automations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  v_run uuid;
begin
  if not (old.status = 'pending' and new.status = 'approved') then
    return new;
  end if;

  for a in
    select * from public.event_automations
    where event_id = new.event_id and enabled and trigger_type = 'registration_approved'
  loop
    insert into public.automation_runs (automation_id, event_id, registration_id, trigger_key)
    values (a.id, new.event_id, new.id, 'registration-approved:' || new.id::text)
    on conflict (automation_id, trigger_key) do nothing
    returning id into v_run;

    if v_run is not null then
      insert into public.email_deliveries
        (event_id, automation_run_id, registration_id, recipient_email, subject, body_text)
      values (new.event_id, v_run, new.id, new.email, a.subject, a.body_text);
    end if;
    v_run := null;
  end loop;

  return new;
end;
$$;

create trigger registrations_queue_approval_automations
after update of status on public.registrations
for each row execute procedure public.queue_approval_automations();

create or replace function public.queue_event_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  with new_runs as (
    insert into public.automation_runs (automation_id, event_id, registration_id, trigger_key)
    select a.id, e.id, r.id,
           'event-reminder-24h:' || a.id::text || ':' || r.id::text || ':' ||
           to_char(e.start_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    from public.event_automations a
    join public.events e on e.id = a.event_id
    join public.registrations r on r.event_id = e.id
    where a.enabled
      and a.trigger_type = 'event_start_24h'
      and e.status = 'published'
      and now() >= e.start_at - interval '24 hours'
      and now() < e.start_at
      and r.status in ('approved', 'checked_in')
    on conflict (automation_id, trigger_key) do nothing
    returning id, automation_id, registration_id, event_id
  ),
  ins as (
    insert into public.email_deliveries
      (event_id, automation_run_id, registration_id, recipient_email, subject, body_text)
    select nr.event_id, nr.id, nr.registration_id, r.email, a.subject, a.body_text
    from new_runs nr
    join public.event_automations a on a.id = nr.automation_id
    join public.registrations r on r.id = nr.registration_id
    returning 1
  )
  select count(*)::integer into v_n from ins;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attribution (recorded server-side from the visitor's own tracked visits)
-- ---------------------------------------------------------------------------

create or replace function public.record_registration_attribution(
  p_registration_id uuid,
  p_visitor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.registrations%rowtype;
  v_first jsonb;
  v_last jsonb;
begin
  select * into v_reg from public.registrations
  where id = p_registration_id and owner_user_id = (select auth.uid());
  if not found then return; end if;
  if exists (select 1 from public.registration_attribution where registration_id = p_registration_id) then
    return;
  end if;

  if p_visitor_id is not null then
    select to_jsonb(t) into v_first from (
      select source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, viewed_at
      from public.event_page_views
      where event_id = v_reg.event_id and visitor_id = p_visitor_id
      order by viewed_at asc limit 1
    ) t;
    select to_jsonb(t) into v_last from (
      select source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, viewed_at
      from public.event_page_views
      where event_id = v_reg.event_id and visitor_id = p_visitor_id
      order by viewed_at desc limit 1
    ) t;
  end if;

  insert into public.registration_attribution
    (registration_id, event_id, visitor_id, first_touch, last_touch)
  values (p_registration_id, v_reg.event_id, p_visitor_id, v_first, v_last)
  on conflict (registration_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Analytics (aggregates only; no attendee identities)
-- ---------------------------------------------------------------------------

create or replace function public.event_analytics(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_approved integer;
  v_checked integer;
begin
  if not public.can_view_analytics(p_event_id) then
    raise exception 'NOT_FOUND';
  end if;

  select e.timezone into v_tz from public.events e where e.id = p_event_id;

  select count(*) filter (where status = 'approved')::integer,
         count(*) filter (where status = 'checked_in')::integer
  into v_approved, v_checked
  from public.registrations where event_id = p_event_id;

  return jsonb_build_object(
    'timezone', v_tz,
    'page_views', (select count(*) from public.event_page_views where event_id = p_event_id),
    'unique_visitors', (select count(distinct visitor_id) from public.event_page_views where event_id = p_event_id),
    'registrations', (select count(*) from public.registrations where event_id = p_event_id),
    'approved', v_approved,
    'checked_in', v_checked,
    'pending', (select count(*) from public.registrations where event_id = p_event_id and status = 'pending'),
    'check_in_rate', case when v_approved + v_checked = 0 then null
                          else round(100.0 * v_checked / (v_approved + v_checked), 1) end,
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', x.d, 'count', x.c) order by x.d)
      from (
        select (r.created_at at time zone v_tz)::date as d, count(*) as c
        from public.registrations r
        where r.event_id = p_event_id
        group by 1
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', s.source, 'views', s.views, 'registrations', s.regs
      ) order by s.regs desc, s.views desc, s.source)
      from (
        select coalesce(v.source, r.source) as source,
               coalesce(v.views, 0) as views,
               coalesce(r.regs, 0) as regs
        from (
          select source, count(*) as views
          from public.event_page_views where event_id = p_event_id group by source
        ) v
        full join (
          select coalesce(a.last_touch ->> 'source', 'Direct') as source, count(*) as regs
          from public.registrations g
          left join public.registration_attribution a on a.registration_id = g.id
          where g.event_id = p_event_id
          group by 1
        ) r on r.source = v.source
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.can_view_analytics(uuid) from public, anon;
grant execute on function public.can_view_analytics(uuid) to authenticated;

revoke all on function public.broadcast_recipient_count(uuid, public.registration_status) from public, anon;
grant execute on function public.broadcast_recipient_count(uuid, public.registration_status) to authenticated;
revoke all on function public.queue_broadcast(uuid, uuid, public.registration_status, text, text) from public, anon;
grant execute on function public.queue_broadcast(uuid, uuid, public.registration_status, text, text) to authenticated;
revoke all on function public.retry_failed_deliveries(uuid) from public, anon;
grant execute on function public.retry_failed_deliveries(uuid) to authenticated;
revoke all on function public.record_registration_attribution(uuid, uuid) from public, anon;
grant execute on function public.record_registration_attribution(uuid, uuid) to authenticated;
revoke all on function public.event_analytics(uuid) from public, anon;
grant execute on function public.event_analytics(uuid) to authenticated;

revoke all on function public.template_unknown_variable(text) from public, anon, authenticated;
revoke all on function public.refresh_broadcast_status(uuid) from public, anon, authenticated;
revoke all on function public.queue_approval_automations() from public, anon, authenticated;

revoke all on function public.claim_email_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_email_deliveries(integer) to service_role;
revoke all on function public.finish_email_delivery(uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_email_delivery(uuid, text, text) to service_role;
revoke all on function public.apply_email_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_email_event(text, text, timestamptz) to service_role;
revoke all on function public.queue_event_reminders() from public, anon, authenticated;
grant execute on function public.queue_event_reminders() to service_role;
