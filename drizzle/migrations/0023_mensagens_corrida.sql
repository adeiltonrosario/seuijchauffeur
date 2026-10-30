CREATE TABLE public.mensagens_corrida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id text NOT NULL REFERENCES public.corridas(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('cliente','motorista')),
  texto_mediado text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mensagens_corrida_corrida_idx ON public.mensagens_corrida(corrida_id, criado_em);

CREATE OR REPLACE FUNCTION public.papel_na_corrida(_corrida text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM corridas c WHERE c.id = _corrida
      AND lower(coalesce(nullif(c.cliente_email,''), c.cliente)) = lower(public.email_logado())) THEN 'cliente'
    WHEN EXISTS (SELECT 1 FROM corridas c JOIN motoristas m ON m.nome = c.motorista
      WHERE c.id = _corrida AND c.motorista <> '' AND lower(m.email) = lower(public.email_logado())) THEN 'motorista'
    ELSE NULL END
$$;
GRANT EXECUTE ON FUNCTION public.papel_na_corrida(text) TO authenticated;

GRANT SELECT ON public.mensagens_corrida TO authenticated;
GRANT ALL ON public.mensagens_corrida TO service_role;
ALTER TABLE public.mensagens_corrida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participantes leem mensagens da corrida" ON public.mensagens_corrida
  FOR SELECT TO authenticated USING (public.papel_na_corrida(corrida_id) IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_corrida;