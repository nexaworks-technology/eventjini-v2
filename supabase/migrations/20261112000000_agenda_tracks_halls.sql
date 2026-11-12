-- Calendar agenda (Zoho Backstage-style): tracks as columns, halls, session types,
-- featured sessions, and "to be announced" sessions without a time yet.

create table public.event_tracks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_tracks_name_not_blank check (char_length(trim(name)) > 0),
  constraint event_tracks_name_length check (char_length(name) <= 60),
  unique (id, event_id)
);
create index event_tracks_event_idx on public.event_tracks (event_id, sort_order);

create table public.event_halls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_halls_name_not_blank check (char_length(trim(name)) > 0),
  constraint event_halls_name_length check (char_length(name) <= 60),
  unique (id, event_id)
);
create index event_halls_event_idx on public.event_halls (event_id, sort_order);

-- Composite foreign keys keep a session's track and hall inside the same event.
-- Deleting a track that still has sessions is refused; deleting a hall leaves its sessions "hall TBA".
alter table public.event_sessions
  add column track_id uuid,
  add column hall_id uuid,
  add column session_type text not null default 'talk',
  add column is_featured boolean not null default false,
  alter column start_at drop not null,
  alter column end_at drop not null,
  add constraint event_sessions_track_fk foreign key (track_id, event_id)
    references public.event_tracks (id, event_id),
  add constraint event_sessions_hall_fk foreign key (hall_id, event_id)
    references public.event_halls (id, event_id) on delete set null (hall_id),
  add constraint event_sessions_type_valid
    check (session_type in ('keynote', 'talk', 'panel', 'workshop', 'break', 'networking', 'other')),
  add constraint event_sessions_time_both_or_neither check ((start_at is null) = (end_at is null));

create index event_sessions_track_idx on public.event_sessions (track_id);
create index event_sessions_hall_idx on public.event_sessions (hall_id);

alter table public.event_tracks enable row level security;
alter table public.event_halls enable row level security;

create policy "Tracks are readable by team and for published events"
on public.event_tracks for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));
create policy "Admins can add tracks" on public.event_tracks for insert to authenticated
with check (public.is_event_admin(event_id));
create policy "Admins can edit tracks" on public.event_tracks for update to authenticated
using (public.is_event_admin(event_id)) with check (public.is_event_admin(event_id));
create policy "Admins can delete tracks" on public.event_tracks for delete to authenticated
using (public.is_event_admin(event_id));

create policy "Halls are readable by team and for published events"
on public.event_halls for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));
create policy "Admins can add halls" on public.event_halls for insert to authenticated
with check (public.is_event_admin(event_id));
create policy "Admins can edit halls" on public.event_halls for update to authenticated
using (public.is_event_admin(event_id)) with check (public.is_event_admin(event_id));
create policy "Admins can delete halls" on public.event_halls for delete to authenticated
using (public.is_event_admin(event_id));

notify pgrst, 'reload schema';
