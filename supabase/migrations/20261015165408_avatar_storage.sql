begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,1048576,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=1048576,allowed_mime_types=excluded.allowed_mime_types;
create policy avatar_owner_read on storage.objects for select to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.active_account()));
-- Writes pass through the authenticated server handler for byte validation and compare-and-swap.
-- No INSERT/UPDATE/DELETE policy: direct client writes must remain denied.
commit;
