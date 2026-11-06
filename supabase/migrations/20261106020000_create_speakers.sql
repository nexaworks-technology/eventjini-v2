-- Speakers (Zoho Backstage-style) and their link to agenda sessions.
-- Speakers are public profiles for published events, so no private contact fields live here.

create table public.event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  designation text,
  organization text,
  bio text,
  photo_url text,
  social_links jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_speakers_name_not_blank check (char_length(trim(name)) > 0),
  constraint event_speakers_name_length check (char_length(name) <= 120),
  constraint event_speakers_designation_length check (designation is null or char_length(designation) <= 120),
  constraint event_speakers_organization_length check (organization is null or char_length(organization) <= 120),
  constraint event_speakers_bio_length check (bio is null or char_length(bio) <= 2000),
  constraint event_speakers_social_links_object check (jsonb_typeof(social_links) = 'object')
);

create index event_speakers_event_idx on public.event_speakers (event_id, sort_order, name);

create trigger event_speakers_set_updated_at
before update on public.event_speakers
for each row execute function public.set_updated_at();

create table public.event_session_speakers (
  session_id uuid not null references public.event_sessions(id) on delete cascade,
  speaker_id uuid not null references public.event_speakers(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (session_id, speaker_id)
);

create index event_session_speakers_speaker_idx on public.event_session_speakers (speaker_id);
create index event_session_speakers_event_idx on public.event_session_speakers (event_id);

-- A link must stay inside one event: the session and the speaker both belong to event_id.
create or replace function public.check_session_speaker_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.event_sessions s where s.id = new.session_id and s.event_id = new.event_id)
     or not exists (select 1 from public.event_speakers p where p.id = new.speaker_id and p.event_id = new.event_id) then
    raise exception 'SESSION_SPEAKER_EVENT_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger event_session_speakers_same_event
before insert or update on public.event_session_speakers
for each row execute function public.check_session_speaker_event();

alter table public.event_speakers enable row level security;
alter table public.event_session_speakers enable row level security;

create policy "Speakers are readable by team and for published events"
on public.event_speakers for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));

create policy "Admins can add speakers"
on public.event_speakers for insert to authenticated
with check (public.is_event_admin(event_id));

create policy "Admins can edit speakers"
on public.event_speakers for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete speakers"
on public.event_speakers for delete to authenticated
using (public.is_event_admin(event_id));

create policy "Session speakers are readable by team and for published events"
on public.event_session_speakers for select to anon, authenticated
using (public.is_event_published(event_id) or public.can_access_event(event_id));

create policy "Admins can link speakers"
on public.event_session_speakers for insert to authenticated
with check (public.is_event_admin(event_id));

create policy "Admins can unlink speakers"
on public.event_session_speakers for delete to authenticated
using (public.is_event_admin(event_id));

-- Allow speaker photos next to covers: events/<event id>/(cover|speakers)/<file>.
create or replace function public.can_manage_event_asset(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  if p_name is null
     or p_name !~ '^events/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(cover|speakers)/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;
  v_event := split_part(p_name, '/', 2)::uuid;
  return public.is_event_admin(v_event);
exception when others then
  return false;
end;
$$;
