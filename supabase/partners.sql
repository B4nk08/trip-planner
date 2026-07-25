-- =============================================
-- Partners login (username + password)
-- Run in Supabase SQL Editor
-- Frontend checks against this table (no Auth)
-- =============================================

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  display_name text not null,
  created_at timestamptz default now()
);

alter table partners enable row level security;

-- Allow the app (anon key) to look up username + password for login
do $$ begin
  create policy "Allow public read partners"
  on partners for select using (true);
exception when duplicate_object then null;
end $$;

-- Optional: allow updating passwords from Table Editor only (service role)
-- No public insert/update/delete from the app

-- Seed two people — change passwords after running if you want
insert into partners (username, password, display_name)
values
  ('titikorn', '123456', 'Titikorn'),
  ('partner', '123456', 'Partner')
on conflict (username) do nothing;
