-- Public-read bucket, 2MB cap, raster images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- Writes are owner-scoped to a folder named for the user's id.
-- Reads need no policy: the bucket is public-read by URL, and with no
-- select policy the bucket still cannot be listed.
create policy logos_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy logos_update_own on storage.objects
  for update to authenticated using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy logos_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text);
