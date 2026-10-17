CREATE TABLE public.precos_esportivo (
  veiculo text PRIMARY KEY CHECK (veiculo IN ('carro','minivan','van')),
  valor_evento numeric NOT NULL DEFAULT 0,
  por_km numeric NOT NULL DEFAULT 3,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.precos_esportivo TO anon, authenticated;
GRANT INSERT, UPDATE ON public.precos_esportivo TO authenticated;
GRANT ALL ON public.precos_esportivo TO service_role;
ALTER TABLE public.precos_esportivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura publica precos esportivo" ON public.precos_esportivo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff insere precos esportivo" ON public.precos_esportivo FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "staff altera precos esportivo" ON public.precos_esportivo FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
INSERT INTO public.precos_esportivo (veiculo, valor_evento, por_km) VALUES ('carro',250,3),('minivan',400,3),('van',650,3);
INSERT INTO public.modalidades (nome, caracteristicas, valor_base, por_km) VALUES ('Translado Esportivo', 'Transporte de delegações de clubes de futebol: atletas, comissão técnica, bagagens e motorista reserva.', 250, 3) ON CONFLICT DO NOTHING;