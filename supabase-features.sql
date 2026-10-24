-- Run once in the SQL Editor of the existing Supabase project.
-- Idempotent; no historical business records are changed or deleted.
begin;

-- Postgres Changes continues to use the table's existing RLS policies.
do $$
begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_data') then
    alter publication supabase_realtime add table public.user_data;
  end if;
end $$;

-- Use the caller's existing RLS permissions; never bypass account isolation.
create or replace function public.product_photo_is_unused(photo_name text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select auth.uid() is not null
    and split_part(photo_name,'/',1)=auth.uid()::text
    and exists(select 1 from public.user_data u where u.user_id=(select auth.uid()))
    and not exists (
      select 1 from public.user_data u,
      lateral jsonb_path_query(u.data::jsonb,'lax $.**.photoPath') p(value)
      where u.user_id=(select auth.uid()) and p.value=to_jsonb(photo_name)
    );
$$;
revoke all on function public.product_photo_is_unused(text) from public, anon;
grant execute on function public.product_photo_is_unused(text) to authenticated;

create or replace function public.unused_product_photos()
returns table(name text) language sql stable security invoker set search_path = ''
as $$
  select o.name from storage.objects o
  where o.bucket_id='product-photos'
    and split_part(o.name,'/',1)=auth.uid()::text
    and o.name ~ '^[a-zA-Z0-9/-]+[.]jpg$'
    and o.created_at < now()-interval '24 hours'
    and public.product_photo_is_unused(o.name)
  order by o.name limit 100;
$$;
revoke all on function public.unused_product_photos() from public, anon;
grant execute on function public.unused_product_photos() to authenticated;

-- Permissive policies authorize only this account's old, unused objects.
drop policy if exists "app_photo_cleanup_select" on storage.objects;
create policy "app_photo_cleanup_select" on storage.objects for select to authenticated
using (bucket_id='product-photos' and split_part(name,'/',1)=auth.uid()::text);
drop policy if exists "app_photo_cleanup_delete" on storage.objects;
create policy "app_photo_cleanup_delete" on storage.objects for delete to authenticated
using (bucket_id='product-photos' and created_at < now()-interval '24 hours'
  and public.product_photo_is_unused(name));

-- Restrictive guard also applies if an older permissive delete policy exists.
-- Non-product buckets retain their existing behavior. No INSERT/UPDATE changes.
drop policy if exists "app_preserve_referenced_photos" on storage.objects;
create policy "app_preserve_referenced_photos" on storage.objects as restrictive
for delete to authenticated using (bucket_id<>'product-photos' or
  (created_at < now()-interval '24 hours' and public.product_photo_is_unused(name)));
commit;
