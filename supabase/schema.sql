-- ============================================================
-- ZORA DATABASE SCHEMA - RUN IN SUPABASE SQL EDITOR
-- ============================================================
-- Execute this entire script in the Supabase SQL Editor.
-- It is idempotent (safe to re-run).
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  dob date not null,
  age int not null,
  age_group text not null check (age_group in ('under_14','14_17','18_plus')),
  phone text,
  phone_verified boolean default false,
  auth_provider text,
  vibe_theme jsonb,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Public can view profiles"
  on profiles for select using (true);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Trigger to block dob / age_group update after signup
create or replace function block_dob_update() returns trigger as $$
begin
  if OLD.dob is distinct from NEW.dob or OLD.age_group is distinct from NEW.age_group then
    raise exception 'DOB and age_group cannot be changed after signup';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists block_dob_trigger on profiles;
create trigger block_dob_trigger
  before update on profiles
  for each row execute function block_dob_update();

-- ---------- POSTS ----------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  caption text,
  media_url text not null check (media_url not ilike '%youtube%' and media_url not ilike '%youtu.be%'),
  media_type text check (media_type in ('image','video')),
  quest_type text check (quest_type in ('quest','flex')) not null,
  created_at timestamp with time zone default now()
);

alter table posts enable row level security;

create policy "Public can view posts"
  on posts for select using (true);

create policy "Authenticated can insert posts"
  on posts for insert with check (auth.role() = 'authenticated');

create policy "Users can delete own posts"
  on posts for delete using (auth.uid() = user_id);

create policy "Users can update own posts"
  on posts for update using (auth.uid() = user_id);

-- ---------- STORIES ----------
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  media_url text not null,
  media_type text check (media_type in ('image','video')) default 'image',
  caption text,
  expires_at timestamp with time zone default now() + interval '24 hours',
  viewers jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

alter table stories enable row level security;

create policy "Public view stories"
  on stories for select using (true);

create policy "Auth insert stories"
  on stories for insert with check (auth.role() = 'authenticated');

create policy "Users delete own stories"
  on stories for delete using (auth.uid() = user_id);

-- ---------- CONVERSATIONS ----------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean default false,
  group_id uuid references groups(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text,
  media_url text,
  twin_draft boolean default false,
  created_at timestamp with time zone default now()
);

alter table conversations enable row level security;
create policy "Auth can view conversations"
  on conversations for select using (auth.role() = 'authenticated');
create policy "Auth can insert conversations"
  on conversations for insert with check (auth.role() = 'authenticated');

alter table messages enable row level security;
create policy "Auth can view messages"
  on messages for select using (auth.role() = 'authenticated');
create policy "Auth can insert messages"
  on messages for insert with check (auth.role() = 'authenticated');

-- ---------- GROUPS ----------
create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

create table if not exists group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  caption text,
  media_url text not null,
  media_type text check (media_type in ('image','video')) default 'image',
  created_at timestamp with time zone default now()
);

alter table groups enable row level security;
create policy "Auth can manage groups"
  on groups for all using (auth.role() = 'authenticated');

alter table group_members enable row level security;
create policy "Auth can manage members"
  on group_members for all using (auth.role() = 'authenticated');

alter table group_posts enable row level security;
create policy "Auth can view group posts"
  on group_posts for select using (auth.role() = 'authenticated');
create policy "Auth can insert group posts"
  on group_posts for insert with check (auth.role() = 'authenticated');

-- ---------- QUEST SESSIONS & OFFLINE ----------
create table if not exists quest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  quest_count int default 0,
  flex_unlocked_until timestamp with time zone,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists offline_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  local_path text not null,
  created_at timestamp with time zone default now()
);

alter table quest_sessions enable row level security;
create policy "Users manage own quest"
  on quest_sessions for all using (auth.uid() = user_id);

alter table offline_saves enable row level security;
create policy "Users manage own offline"
  on offline_saves for all using (auth.uid() = user_id);

-- ---------- LIKES ----------
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

alter table likes enable row level security;
create policy "Public can view likes"
  on likes for select using (true);
create policy "Auth can like"
  on likes for insert with check (auth.role() = 'authenticated');
create policy "Auth can unlike"
  on likes for delete using (auth.uid() = user_id);

-- ---------- COMMENTS ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table comments enable row level security;
create policy "Public can view comments"
  on comments for select using (true);
create policy "Auth can comment"
  on comments for insert with check (auth.role() = 'authenticated');

-- ---------- FOLLOWS ----------
create table if not exists follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;
create policy "Public can view follows"
  on follows for select using (true);
create policy "Auth can follow"
  on follows for insert with check (auth.role() = 'authenticated');
create policy "Auth can unfollow"
  on follows for delete using (auth.uid() = follower_id);

-- ---------- STORAGE BUCKET ----------
insert into storage.buckets (id, name, public)
values ('zora-media', 'zora-media', true)
on conflict (id) do nothing;

create policy "Public can view media"
  on storage.objects for select using (bucket_id = 'zora-media');

create policy "Authenticated can upload media"
  on storage.objects for insert
  with check (bucket_id = 'zora-media' and auth.role() = 'authenticated');

create policy "Users can update own media"
  on storage.objects for update
  using (bucket_id = 'zora-media' and auth.role() = 'authenticated');

create policy "Users can delete own media"
  on storage.objects for delete
  using (bucket_id = 'zora-media' and auth.role() = 'authenticated');

-- ---------- REALTIME ----------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table stories;
alter publication supabase_realtime add table posts;

-- Done. ZORA database is ready.
