-- Storage Bucket für Fahrzeugbilder
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

-- Jeder eingeloggte User darf in seinen Ordner hochladen
create policy "upload_own_images" on storage.objects
  for insert with check (
    bucket_id = 'vehicle-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Öffentliches Lesen (für Inserat-Vorschauen)
create policy "public_read_images" on storage.objects
  for select using (bucket_id = 'vehicle-images');

-- Nur eigene Bilder löschen
create policy "delete_own_images" on storage.objects
  for delete using (
    bucket_id = 'vehicle-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
