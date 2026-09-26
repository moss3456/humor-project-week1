-- Week 3: profiles, automatic profile creation, and avatar storage.
-- Per the assignment instructions, this migration does not create, enable,
-- disable, or alter any Row Level Security policies.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text null,
  last_name text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill a profile for users who existed before this trigger was installed.
insert into public.profiles (id, first_name, last_name, avatar_url)
select
  id,
  raw_user_meta_data ->> 'given_name',
  raw_user_meta_data ->> 'family_name',
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

-- Public reads make stored profile photos displayable without storing binary
-- image data in Postgres. Uploads are performed by the authenticated server
-- route using the server-only service role key.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
