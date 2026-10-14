-- Vendors: record the city or location a supplier operates from.
alter table public.event_vendors
  add column city text,
  add constraint event_vendors_city_length check (city is null or char_length(city) <= 80);
