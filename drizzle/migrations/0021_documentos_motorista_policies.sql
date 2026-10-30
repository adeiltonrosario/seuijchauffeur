CREATE POLICY "candidato envia documentos" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'documentos-motorista' AND (storage.foldername(name))[1] = 'cadastro');
CREATE POLICY "equipe le documentos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-motorista' AND public.is_staff());