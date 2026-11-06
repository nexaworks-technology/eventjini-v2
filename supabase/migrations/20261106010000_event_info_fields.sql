-- Event info fields modelled on Zoho Backstage's Event Info page.
-- All columns are additive with defaults, so existing events and code keep working.
alter table public.events
  add column event_type text not null default 'in_person',
  add column summary text,
  add column tags text[] not null default '{}',
  add column venue_address text,
  add column social_links jsonb not null default '{}'::jsonb,
  add constraint events_event_type_valid check (event_type in ('in_person', 'virtual', 'hybrid')),
  add constraint events_summary_length check (summary is null or char_length(summary) <= 250),
  add constraint events_tags_limit check (cardinality(tags) <= 10),
  add constraint events_venue_address_length check (venue_address is null or char_length(venue_address) <= 500),
  add constraint events_social_links_object check (jsonb_typeof(social_links) = 'object');
