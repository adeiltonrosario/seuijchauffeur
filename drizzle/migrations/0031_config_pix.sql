CREATE TABLE public.config_pix (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  tipo text NOT NULL DEFAULT 'CNPJ',
  chave text NOT NULL DEFAULT '',
  titular text NOT NULL DEFAULT '',
  banco text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.config_pix TO anon, authenticated;
GRANT INSERT, UPDATE ON public.config_pix TO authenticated;
GRANT ALL ON public.config_pix TO service_role;
ALTER TABLE public.config_pix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leem chave pix" ON public.config_pix FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Equipe insere chave pix" ON public.config_pix FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "Equipe altera chave pix" ON public.config_pix FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
INSERT INTO public.config_pix (id) VALUES (true);