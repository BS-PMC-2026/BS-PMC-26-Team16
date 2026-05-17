-- Run this in the Supabase SQL editor
-- station_id is TEXT to support both:
--   private stations (UUID from charging_stations table)
--   public stations  (key like "pub_31.234567_34.789012")

create table if not exists public.user_favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  station_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

-- Users can only read/write their own favorites
alter table public.user_favorites enable row level security;

create policy "users can view own favorites"
  on public.user_favorites for select
  using (auth.uid() = user_id);

create policy "users can insert own favorites"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

create policy "users can delete own favorites"
  on public.user_favorites for delete
  using (auth.uid() = user_id);
