create type public.vendor_status as enum ('prospect', 'confirmed', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Events: branding colours and one event-level display currency
-- ---------------------------------------------------------------------------

alter table public.events
  add column primary_color text,
  add column accent_color text,
  add column currency text not null default 'INR';

alter table public.events
  add constraint events_primary_color_hex check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint events_accent_color_hex check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint events_currency_code check (currency ~ '^[A-Z]{3}$');

-- ---------------------------------------------------------------------------
-- Budget and vendors
-- ---------------------------------------------------------------------------

create table public.event_budget_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null,
  name text not null,
  estimated_amount numeric(12,2) not null default 0,
  actual_amount numeric(12,2) not null default 0,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(category)) > 0),
  check (char_length(trim(name)) > 0),
  check (estimated_amount >= 0),
  check (actual_amount >= 0)
);

create table public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  category text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  cost numeric(12,2) not null default 0,
  status public.vendor_status not null default 'prospect',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) > 0),
  check (char_length(trim(category)) > 0),
  check (cost >= 0)
);

create index event_budget_items_event_id_idx on public.event_budget_items (event_id);
create index event_vendors_event_id_idx on public.event_vendors (event_id);

create trigger event_budget_items_set_updated_at
before update on public.event_budget_items
for each row execute procedure public.set_updated_at();

create trigger event_vendors_set_updated_at
before update on public.event_vendors
for each row execute procedure public.set_updated_at();

alter table public.event_budget_items enable row level security;
alter table public.event_vendors enable row level security;

-- read: owner / admin / viewer (scanner none). write: owner / admin.
create policy "Budget readable by owner admin and viewer"
on public.event_budget_items for select to authenticated
using (public.can_view_analytics(event_id));

create policy "Admins can add budget items"
on public.event_budget_items for insert to authenticated
with check (public.is_event_admin(event_id) and created_by = (select auth.uid()));

create policy "Admins can edit budget items"
on public.event_budget_items for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete budget items"
on public.event_budget_items for delete to authenticated
using (public.is_event_admin(event_id));

create policy "Vendors readable by owner admin and viewer"
on public.event_vendors for select to authenticated
using (public.can_view_analytics(event_id));

create policy "Admins can add vendors"
on public.event_vendors for insert to authenticated
with check (public.is_event_admin(event_id));

create policy "Admins can edit vendors"
on public.event_vendors for update to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Admins can delete vendors"
on public.event_vendors for delete to authenticated
using (public.is_event_admin(event_id));

-- ---------------------------------------------------------------------------
-- Storage: public-read bucket for event covers, writes only by event owner/admin
-- under events/<event-id>/cover/<safe-file-name>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-assets', 'event-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

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
     or p_name !~ '^events/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cover/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;
  v_event := split_part(p_name, '/', 2)::uuid;
  return public.is_event_admin(v_event);
exception when others then
  return false;
end;
$$;

revoke all on function public.can_manage_event_asset(text) from public, anon;
grant execute on function public.can_manage_event_asset(text) to authenticated;

create policy "Event covers are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'event-assets');

create policy "Event admins can upload covers"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-assets' and public.can_manage_event_asset(name));

create policy "Event admins can replace covers"
on storage.objects for update to authenticated
using (bucket_id = 'event-assets' and public.can_manage_event_asset(name))
with check (bucket_id = 'event-assets' and public.can_manage_event_asset(name));

create policy "Event admins can delete covers"
on storage.objects for delete to authenticated
using (bucket_id = 'event-assets' and public.can_manage_event_asset(name));
