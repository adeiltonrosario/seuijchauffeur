CREATE TABLE public.planos_rota_exclusiva (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  nome text NOT NULL DEFAULT 'Rota Exclusiva',
  origem_fixa text NOT NULL,
  destino_fixo text NOT NULL,
  valor_trecho_fixo numeric NOT NULL DEFAULT 0,
  viagens_inclusas integer NOT NULL DEFAULT 0,
  valor_mensal numeric NOT NULL DEFAULT 0,
  por_km_variado numeric NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'pre_pago',
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_rota_exclusiva TO authenticated;
GRANT ALL ON public.planos_rota_exclusiva TO service_role;
ALTER TABLE public.planos_rota_exclusiva ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe gerencia rota exclusiva" ON public.planos_rota_exclusiva FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "cliente ve sua rota exclusiva" ON public.planos_rota_exclusiva FOR SELECT TO authenticated
  USING (ativo AND lower(cliente_email) = lower(public.email_logado()));