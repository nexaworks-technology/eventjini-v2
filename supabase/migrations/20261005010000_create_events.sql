create type public.event_status as enum (
  'draft',
  'review',
  'scheduled',
  'published',
  'sales_open',
  'pre_event',
  'live',
  'completed',
  'cancelled',
  'archived'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),

  organizer_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,
  slug text not null unique,
  description text,

  cover_image_url text,

  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null,

  location text,

  capacity integer,

  requires_approval boolean not null default false,
  require_b2b_data boolean not null default false,

  status public.event_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_title_not_blank
    check (char_length(trim(title)) > 0),

  constraint events_slug_not_blank
    check (char_length(trim(slug)) > 0),

  constraint events_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  constraint events_end_after_start
    check (end_at > start_at),

  constraint events_capacity_positive
    check (capacity is null or capacity > 0)
);

create index events_organizer_id_idx on public.events (organizer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
before update on public.events
for each row
execute procedure public.set_updated_at();

alter table public.events enable row level security;

create policy "Organizers can view own events"
on public.events
for select
to authenticated
using (organizer_id = (select auth.uid()));

create policy "Organizers can create own events"
on public.events
for insert
to authenticated
with check (organizer_id = (select auth.uid()));

create policy "Organizers can update own events"
on public.events
for update
to authenticated
using (organizer_id = (select auth.uid()))
with check (organizer_id = (select auth.uid()));

create policy "Published events are public"
on public.events
for select
to anon, authenticated
using (status = 'published');

-- Slug availability must see other organizers' private drafts, which RLS hides,
-- so this runs as definer and returns only a boolean. Signed-in users only.
create or replace function public.is_slug_available(
  p_slug text,
  p_exclude_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.events
    where slug = p_slug
      and (p_exclude_id is null or id <> p_exclude_id)
  );
$$;

revoke all on function public.is_slug_available(text, uuid) from public, anon;
grant execute on function public.is_slug_available(text, uuid) to authenticated;
