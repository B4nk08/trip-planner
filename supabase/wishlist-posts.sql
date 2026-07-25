-- =============================================
-- Wishlist posts: author + likes
-- Run in Supabase SQL Editor
-- =============================================

alter table wishlist_items
  add column if not exists author_id uuid references partners(id) on delete set null;

alter table wishlist_items
  add column if not exists author_name text;

alter table wishlist_items
  add column if not exists liked_by uuid[] not null default '{}';

create index if not exists wishlist_items_created_at_idx
  on wishlist_items (created_at desc);
