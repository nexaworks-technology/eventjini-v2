-- Unsubscribe: per-registration email preferences. Broadcasts skip opted-out registrations;
-- transactional automation emails (approval, reminders) are unaffected.
create table public.registration_email_prefs (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  opted_out_at timestamptz,
  created_at timestamptz not null default now()
);

-- No policies: only SECURITY DEFINER functions and the service role ever touch this table.
alter table public.registration_email_prefs enable row level security;
revoke all on public.registration_email_prefs from anon, authenticated;

insert into public.registration_email_prefs (registration_id)
select id from public.registrations
on conflict do nothing;

create or replace function public.create_registration_email_prefs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.registration_email_prefs (registration_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.create_registration_email_prefs() from public, anon, authenticated;

create trigger registrations_create_email_prefs
  after insert on public.registrations
  for each row execute function public.create_registration_email_prefs();

create or replace function public.unsubscribe_preview(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('event_title', e.title, 'opted_out', p.opted_out_at is not null)
  from public.registration_email_prefs p
  join public.registrations r on r.id = p.registration_id
  join public.events e on e.id = r.event_id
  where p.token = p_token;
$$;

create or replace function public.set_email_opt_out(p_token uuid, p_opt_out boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_n integer;
begin
  update public.registration_email_prefs
  set opted_out_at = case when p_opt_out then coalesce(opted_out_at, now()) else null end
  where token = p_token;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.unsubscribe_preview(uuid) from public;
grant execute on function public.unsubscribe_preview(uuid) to anon, authenticated;
revoke all on function public.set_email_opt_out(uuid, boolean) from public;
grant execute on function public.set_email_opt_out(uuid, boolean) to anon, authenticated;

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
    and not exists (select 1 from public.registration_email_prefs p where p.registration_id = r.id and p.opted_out_at is not null)
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
  where r.event_id = p_event_id and r.status = p_segment
  and not exists (select 1 from public.registration_email_prefs p where p.registration_id = r.id and p.opted_out_at is not null);
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
  and not exists (select 1 from public.registration_email_prefs p where p.registration_id = r.id and p.opted_out_at is not null)
  on conflict do nothing;

  return jsonb_build_object('broadcast_id', v_id, 'recipient_count', v_count, 'duplicate', false);
end;
$$;

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
    'event_location', e.location,
    'event_slug', e.slug,
    'event_primary_color', e.primary_color,
    'event_cover_image_url', e.cover_image_url,
    'is_broadcast', u.broadcast_id is not null,
    'unsubscribe_token', pr.token
  )), '[]'::jsonb)
  from upd u
  join public.registrations r on r.id = u.registration_id
  join public.events e on e.id = u.event_id
  left join public.registration_email_prefs pr on pr.registration_id = u.registration_id;
$$;

revoke all on function public.broadcast_recipient_count(uuid, public.registration_status) from public, anon;
grant execute on function public.broadcast_recipient_count(uuid, public.registration_status) to authenticated;
revoke all on function public.queue_broadcast(uuid, uuid, public.registration_status, text, text) from public, anon;
grant execute on function public.queue_broadcast(uuid, uuid, public.registration_status, text, text) to authenticated;
revoke all on function public.claim_email_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_email_deliveries(integer) to service_role;
