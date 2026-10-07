CREATE TABLE public.corridas (
  id text PRIMARY KEY,
  cliente text NOT NULL,
  cliente_email text NOT NULL DEFAULT '',
  cliente_whatsapp text NOT NULL DEFAULT '',
  motorista text NOT NULL,
  embarque text NOT NULL,
  parada text,
  desembarque text NOT NULL,
  ida text NOT NULL,
  retorno text,
  modalidade text NOT NULL,
  pagamento text NOT NULL DEFAULT 'Pix',
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  veiculo text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'Sedan',
  capacidade integer NOT NULL DEFAULT 4,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.corridas TO anon, authenticated;
GRANT ALL ON public.corridas TO service_role;
ALTER TABLE public.corridas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler corridas" ON public.corridas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "criar corridas" ON public.corridas FOR INSERT TO anon, authenticated WITH CHECK (status = 'pendente');
CREATE POLICY "atualizar corridas" ON public.corridas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (status IN ('pendente','confirmado','em-andamento','concluido','cancelado'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.corridas;