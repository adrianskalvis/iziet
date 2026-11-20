-- Optional cross-device sync for Iziet (Supabase, EU region).
-- One row per signed-in user. Row-level security limits every user to their own row.
-- Enable Google and Apple providers in Supabase Auth, then build with:
--   VITE_FEATURE_SYNC=1 VITE_SUPABASE_URL=https://<project>.supabase.co VITE_SUPABASE_ANON_KEY=<anon key>

create table if not exists public.profiles (
	user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
	data jsonb not null,
	updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own row: read" on public.profiles for select using (auth.uid() = user_id);
create policy "own row: insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.profiles for update using (auth.uid() = user_id);
create policy "own row: delete" on public.profiles for delete using (auth.uid() = user_id);
