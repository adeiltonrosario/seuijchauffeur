CREATE TABLE public.codigos_indicacao (
  codigo text PRIMARY KEY,
  titular_email text NOT NULL UNIQUE,
  titular_nome text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.usos_indicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL REFERENCES public.codigos_indicacao(codigo) ON DELETE CASCADE,
  indicado_email text NOT NULL UNIQUE,
  indicado_nome text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.codigos_indicacao, public.usos_indicacao TO authenticated;
GRANT ALL ON public.codigos_indicacao, public.usos_indicacao TO service_role;
ALTER TABLE public.codigos_indicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usos_indicacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve codigos" ON public.codigos_indicacao FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "staff ve usos" ON public.usos_indicacao FOR SELECT TO authenticated USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.meu_codigo_indicacao(_email text, _nome text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; e text := lower(trim(_email)); n int;
BEGIN
  IF e = '' OR position('@' in e) = 0 THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  SELECT codigo INTO c FROM codigos_indicacao WHERE titular_email = e;
  IF c IS NULL THEN
    LOOP
      c := 'VIP-' || upper(substr(md5(random()::text), 1, 4));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM codigos_indicacao WHERE codigo = c);
    END LOOP;
    INSERT INTO codigos_indicacao (codigo, titular_email, titular_nome) VALUES (c, e, coalesce(_nome,''));
  END IF;
  SELECT count(*) INTO n FROM usos_indicacao WHERE codigo = c;
  RETURN json_build_object('codigo', c, 'usos', n,
    'indicados', coalesce((SELECT json_agg(split_part(indicado_nome,' ',1) ORDER BY criado_em) FROM usos_indicacao WHERE codigo = c), '[]'::json));
END $$;

CREATE OR REPLACE FUNCTION public.usar_codigo_indicacao(_codigo text, _email text, _nome text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; e text := lower(trim(_email)); k text := upper(trim(_codigo));
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(k));
  SELECT titular_email INTO t FROM codigos_indicacao WHERE codigo = k;
  IF t IS NULL THEN RETURN 'Código não encontrado.'; END IF;
  IF t = e THEN RETURN 'Você não pode usar o próprio código.'; END IF;
  IF EXISTS (SELECT 1 FROM usos_indicacao WHERE indicado_email = e) THEN RETURN 'Este e-mail já usou um código de indicação.'; END IF;
  IF (SELECT count(*) FROM usos_indicacao WHERE codigo = k) >= 4 THEN RETURN 'Os 4 convites deste código já foram usados.'; END IF;
  INSERT INTO usos_indicacao (codigo, indicado_email, indicado_nome) VALUES (k, e, coalesce(_nome,''));
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.meu_codigo_indicacao(text,text), public.usar_codigo_indicacao(text,text,text) TO anon, authenticated;