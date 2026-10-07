-- Week 4: image caption generation, voting, and least-privilege RLS.
-- Review this file before running it in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  description text null,
  generation_status text not null default 'processing'
    check (generation_status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 240),
  tone text not null check (tone in ('deadpan', 'absurd', 'observational', 'wildcard')),
  display_order smallint not null check (display_order between 1 and 4),
  model text not null,
  prompt_version text not null default 'week4-v1',
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0),
  created_at timestamptz not null default now(),
  unique (image_id, display_order)
);

create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index if not exists images_created_at_idx
  on public.images (created_at desc);
create index if not exists images_uploader_created_at_idx
  on public.images (uploader_id, created_at desc);
create index if not exists captions_image_id_idx
  on public.captions (image_id, display_order);
create index if not exists caption_votes_caption_id_idx
  on public.caption_votes (caption_id);

create or replace function public.refresh_caption_vote_counts(target_caption_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.captions
  set
    upvotes = (
      select count(*)::integer
      from public.caption_votes
      where caption_id = target_caption_id and value = 1
    ),
    downvotes = (
      select count(*)::integer
      from public.caption_votes
      where caption_id = target_caption_id and value = -1
    )
  where id = target_caption_id;
$$;

create or replace function public.handle_caption_vote_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_caption_vote_counts(old.caption_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_caption_vote_counts(new.caption_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists caption_vote_counts_after_change on public.caption_votes;
create trigger caption_vote_counts_after_change
  after insert or update or delete on public.caption_votes
  for each row execute function public.handle_caption_vote_change();

revoke all on function public.refresh_caption_vote_counts(uuid) from public, anon, authenticated;
revoke all on function public.handle_caption_vote_change() from public, anon, authenticated;

alter table public.jokes enable row level security;
alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;

drop policy if exists "Anyone can read jokes" on public.jokes;
create policy "Anyone can read jokes"
on public.jokes for select
to anon, authenticated
using (true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Anyone can read ready images" on public.images;
create policy "Anyone can read ready images"
on public.images for select
to anon, authenticated
using (generation_status = 'ready');

drop policy if exists "Uploaders can read their pending images" on public.images;
create policy "Uploaders can read their pending images"
on public.images for select
to authenticated
using ((select auth.uid()) = uploader_id);

drop policy if exists "Users can create their own images" on public.images;
create policy "Users can create their own images"
on public.images for insert
to authenticated
with check ((select auth.uid()) = uploader_id);

drop policy if exists "Users can update their own images" on public.images;
create policy "Users can update their own images"
on public.images for update
to authenticated
using ((select auth.uid()) = uploader_id)
with check ((select auth.uid()) = uploader_id);

drop policy if exists "Anyone can read captions for ready images" on public.captions;
create policy "Anyone can read captions for ready images"
on public.captions for select
to anon, authenticated
using (
  exists (
    select 1 from public.images
    where images.id = captions.image_id
      and images.generation_status = 'ready'
  )
);

drop policy if exists "Uploaders can create captions for their images" on public.captions;
create policy "Uploaders can create captions for their images"
on public.captions for insert
to authenticated
with check (
  exists (
    select 1 from public.images
    where images.id = captions.image_id
      and images.uploader_id = (select auth.uid())
  )
);

drop policy if exists "Users can read their own votes" on public.caption_votes;
create policy "Users can read their own votes"
on public.caption_votes for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can cast their own votes" on public.caption_votes;
create policy "Users can cast their own votes"
on public.caption_votes for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can change their own votes" on public.caption_votes;
create policy "Users can change their own votes"
on public.caption_votes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own votes" on public.caption_votes;
create policy "Users can remove their own votes"
on public.caption_votes for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.jokes to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.images, public.captions to anon, authenticated;
grant insert, update on public.images to authenticated;
grant insert on public.captions to authenticated;
grant select, insert, update, delete on public.caption_votes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'caption-images',
    'caption-images',
    true,
    4194304,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own caption images" on storage.objects;
create policy "Users can upload their own caption images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'caption-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
