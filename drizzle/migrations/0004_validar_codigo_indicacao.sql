CREATE OR REPLACE FUNCTION public.validar_codigo_indicacao(_codigo text, _email text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t text; e text := lower(trim(_email)); k text := upper(trim(_codigo));
BEGIN
  SELECT titular_email INTO t FROM codigos_indicacao WHERE codigo = k;
  IF t IS NULL THEN RETURN 'Código não encontrado.'; END IF;
  IF t = e THEN RETURN 'Você não pode usar o próprio código.'; END IF;
  IF EXISTS (SELECT 1 FROM usos_indicacao WHERE indicado_email = e) THEN RETURN 'Este e-mail já usou um código de indicação.'; END IF;
  IF (SELECT count(*) FROM usos_indicacao WHERE codigo = k) >= 4 THEN RETURN 'Os 4 convites deste código já foram usados.'; END IF;
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.validar_codigo_indicacao(text, text) TO anon, authenticated;