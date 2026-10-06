CREATE TABLE public.planos_modalidade (
  id text PRIMARY KEY,
  modalidade text NOT NULL,
  nome text NOT NULL,
  periodicidade text NOT NULL,
  viagens_mes integer NOT NULL DEFAULT 12,
  preco_viagem numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.planos_modalidade TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_modalidade TO authenticated;
GRANT ALL ON public.planos_modalidade TO service_role;
ALTER TABLE public.planos_modalidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica planos" ON public.planos_modalidade FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff insere planos" ON public.planos_modalidade FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "staff altera planos" ON public.planos_modalidade FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff exclui planos" ON public.planos_modalidade FOR DELETE TO authenticated USING (public.is_staff());