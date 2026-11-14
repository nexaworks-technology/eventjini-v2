-- Profile page: people can edit their own name, job title and company size.

alter table public.profiles
  add column job_title text,
  add column company_size text,
  add constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 100),
  add constraint profiles_job_title_length check (job_title is null or char_length(job_title) <= 100),
  add constraint profiles_company_size_valid check (company_size is null or company_size in ('1-10', '11-50', '51-200', '201-500', '500+'));

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, job_title, company_size) on public.profiles to authenticated;

notify pgrst, 'reload schema';
