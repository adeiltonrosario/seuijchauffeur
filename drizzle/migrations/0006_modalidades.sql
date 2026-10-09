CREATE TABLE public.modalidades (
  nome text PRIMARY KEY,
  caracteristicas text NOT NULL DEFAULT '',
  valor_base numeric NOT NULL DEFAULT 0,
  por_km numeric NOT NULL DEFAULT 3,
  por_turno boolean NOT NULL DEFAULT false,
  valor_turno numeric NOT NULL DEFAULT 0,
  franquia_km numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.modalidades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidades TO authenticated;
GRANT ALL ON public.modalidades TO service_role;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica modalidades" ON public.modalidades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff insere modalidades" ON public.modalidades FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "staff altera modalidades" ON public.modalidades FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff exclui modalidades" ON public.modalidades FOR DELETE TO authenticated USING (public.is_staff());