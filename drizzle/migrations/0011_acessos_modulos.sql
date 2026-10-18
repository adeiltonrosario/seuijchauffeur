CREATE TABLE public.acessos_modulos (
  email text NOT NULL,
  modulo text NOT NULL CHECK (modulo IN ('esportivo','suporte_ia')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, modulo)
);
GRANT SELECT, INSERT, DELETE ON public.acessos_modulos TO authenticated;
GRANT ALL ON public.acessos_modulos TO service_role;
ALTER TABLE public.acessos_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff le" ON public.acessos_modulos FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "staff insere" ON public.acessos_modulos FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "staff exclui" ON public.acessos_modulos FOR DELETE TO authenticated USING (public.is_staff());
CREATE OR REPLACE FUNCTION public.modulos_liberados(_email text)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(modulo), '{}') FROM public.acessos_modulos WHERE email = lower(trim(_email));
$$;
GRANT EXECUTE ON FUNCTION public.modulos_liberados(text) TO anon, authenticated;