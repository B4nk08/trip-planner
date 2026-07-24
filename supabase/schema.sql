-- =============================================
-- 1) ตาราง activities (ถ้ายังไม่มี)
-- =============================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  day_number int not null,
  time text,
  location text,
  activity text,
  note text,
  image_url text,
  order_index int not null default 0,
  created_at timestamptz default now()
);

-- ถ้ามีตารางอยู่แล้ว ให้รันบรรทัดนี้เพื่อเพิ่มคอลัมน์รูป
alter table activities
  add column if not exists image_url text;

alter table activities enable row level security;

-- Policies (ข้ามได้ถ้ามีอยู่แล้ว)
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

-- Realtime
alter publication supabase_realtime add table activities;

-- =============================================
-- 2) Storage bucket สำหรับรูปกิจกรรม
-- =============================================
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

-- อ่านรูปได้ทุกคน (เพราะเป็น public bucket)
do $$ begin
  create policy "Public read activity images"
  on storage.objects for select
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

-- อัปโหลดได้ทุกคน (ชั่วคราว กันด้วย passcode หน้าเว็บ)
do $$ begin
  create policy "Public upload activity images"
  on storage.objects for insert
  with check (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

-- อัปเดตไฟล์ได้
do $$ begin
  create policy "Public update activity images"
  on storage.objects for update
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;

-- ลบไฟล์ได้
do $$ begin
  create policy "Public delete activity images"
  on storage.objects for delete
  using (bucket_id = 'activity-images');
exception when duplicate_object then null;
end $$;
