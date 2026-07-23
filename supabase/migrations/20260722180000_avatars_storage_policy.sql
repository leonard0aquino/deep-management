-- ============================================================================
-- Política de Storage: usuários autenticados podem enviar fotos de
-- stakeholder no bucket "avatars" (leitura já é pública, escrita precisa
-- de policy própria em storage.objects).
-- ============================================================================

create policy "authenticated upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "authenticated update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "authenticated delete avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars');
