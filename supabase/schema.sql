-- =============================================
-- Trip Planner schema (trips + fund + activities)
-- Run in Supabase SQL Editor (safe to re-run)
-- =============================================

-- ---------------------------------------------
-- 1) trips
-- ---------------------------------------------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table trips enable row level security;

do $$ begin
  create policy "Allow public read trips"
  on trips for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public insert trips"
  on trips for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public update trips"
  on trips for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public delete trips"
  on trips for delete using (true);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------
-- 2) fund_transactions
-- ---------------------------------------------
create table if not exists fund_transactions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null check (type in ('receive', 'pay')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text,
  created_at timestamptz default now()
);

create index if not exists fund_transactions_trip_id_idx
  on fund_transactions (trip_id);

alter table fund_transactions enable row level security;

do $$ begin
  create policy "Allow public read fund_transactions"
  on fund_transactions for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public insert fund_transactions"
  on fund_transactions for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public update fund_transactions"
  on fund_transactions for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public delete fund_transactions"
  on fund_transactions for delete using (true);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------
-- 3) activities (base + migrate to trip_id / day_date)
-- ---------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  day_number int,
  time text,
  location text,
  activity text,
  note text,
  image_url text,
  order_index int not null default 0,
  created_at timestamptz default now()
);

alter table activities
  add column if not exists image_url text;

alter table activities
  add column if not exists trip_id uuid;

alter table activities
  add column if not exists day_date date;

-- Seed a default trip and attach existing activities
insert into trips (id, name)
select gen_random_uuid(), 'My Trip'
where not exists (select 1 from trips);

update activities
set trip_id = (select id from trips order by created_at asc limit 1)
where trip_id is null;

-- Convert day_number → day_date (anchor Day 1 to today if migrating)
do $$
declare
  base_date date := current_date;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activities'
      and column_name = 'day_number'
  ) then
    update activities
    set day_date = base_date + (coalesce(day_number, 1) - 1)
    where day_date is null and day_number is not null;
  end if;
end $$;

update activities
set day_date = current_date
where day_date is null;

-- Enforce FK after backfill
do $$ begin
  alter table activities
    alter column trip_id set not null;
exception when others then null;
end $$;

do $$ begin
  alter table activities
    alter column day_date set not null;
exception when others then null;
end $$;

do $$ begin
  alter table activities
    add constraint activities_trip_id_fkey
    foreign key (trip_id) references trips(id) on delete cascade;
exception when duplicate_object then null;
end $$;

create index if not exists activities_trip_id_idx on activities (trip_id);
create index if not exists activities_day_date_idx on activities (day_date);

-- Drop legacy day_number if present
alter table activities drop column if exists day_number;

alter table activities enable row level security;

do $$ begin
  create policy "Allow public read"
  on activities for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public insert"
  on activities for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public update"
  on activities for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow public delete"
  on activities for delete using (true);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------
-- 4) Realtime
-- ---------------------------------------------
do $$ begin
  alter publication supabase_realtime add table activities;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table trips;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table fund_transactions;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------
-- 5) Storage bucket for activity images
-- ---------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-images',
  'activity-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "Public read activity images"
  on storage.objects for select
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public upload activity images"
  on storage.objects for insert
  with check (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public update activity images"
  on storage.objects for update
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public delete activity images"
  on storage.objects for delete
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;
