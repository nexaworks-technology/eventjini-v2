-- Email delivery context now includes event branding so emails can be rendered on-brand.
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
    'event_cover_image_url', e.cover_image_url
  )), '[]'::jsonb)
  from upd u
  join public.registrations r on r.id = u.registration_id
  join public.events e on e.id = u.event_id;
$$;

revoke all on function public.claim_email_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_email_deliveries(integer) to service_role;
