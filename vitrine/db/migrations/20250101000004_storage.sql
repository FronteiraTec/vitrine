-- =============================================================================
-- Vitrine — 0004 | Supabase Storage
-- Três buckets públicos para leitura (a vitrine é pública) e escrita restrita
-- por papel. O limite de tamanho e os MIME types são validados no servidor,
-- não apenas no formulário.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('initiative-images', 'initiative-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('category-images',   'category-images',   true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('avatars',           'avatars',           true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Leitura — os três buckets alimentam páginas públicas
-- -----------------------------------------------------------------------------
drop policy if exists vitrine_images_read on storage.objects;
create policy vitrine_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('initiative-images', 'category-images', 'avatars'));

-- -----------------------------------------------------------------------------
-- initiative-images — qualquer membro ativo envia; remove quem enviou,
-- revisores e administradores.
-- -----------------------------------------------------------------------------
drop policy if exists initiative_images_insert on storage.objects;
create policy initiative_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'initiative-images' and public.is_staff());

drop policy if exists initiative_images_update on storage.objects;
create policy initiative_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'initiative-images' and (owner = auth.uid() or public.can_review()))
  with check (bucket_id = 'initiative-images' and public.is_staff());

drop policy if exists initiative_images_delete on storage.objects;
create policy initiative_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'initiative-images' and (owner = auth.uid() or public.can_review()));

-- -----------------------------------------------------------------------------
-- category-images — parte da identidade da vitrine, só administradores
-- -----------------------------------------------------------------------------
drop policy if exists category_images_write on storage.objects;
create policy category_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'category-images' and public.is_admin())
  with check (bucket_id = 'category-images' and public.is_admin());

-- -----------------------------------------------------------------------------
-- avatars — cada usuário só escreve dentro da própria pasta `<uid>/…`
-- -----------------------------------------------------------------------------
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
