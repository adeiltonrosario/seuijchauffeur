ALTER TABLE public.planos_modalidade ADD COLUMN km_mes numeric NOT NULL DEFAULT 120;
ALTER TABLE public.planos_modalidade ADD COLUMN preco_km numeric NOT NULL DEFAULT 3.00;
ALTER TABLE public.planos_modalidade ADD COLUMN excedente_km numeric NOT NULL DEFAULT 3.00;
UPDATE public.planos_modalidade p SET preco_km = m.por_km, excedente_km = m.por_km FROM public.modalidades m WHERE m.nome = p.modalidade AND m.por_km > 0;
COMMENT ON COLUMN public.planos_modalidade.viagens_mes IS 'DEPRECATED: replaced by km_mes';
COMMENT ON COLUMN public.planos_modalidade.preco_viagem IS 'DEPRECATED: replaced by preco_km';