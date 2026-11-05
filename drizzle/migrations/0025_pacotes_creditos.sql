CREATE OR REPLACE FUNCTION public.vencimento_periodo(_base timestamptz, _periodicidade text)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT _base + CASE _periodicidade
    WHEN 'diario' THEN interval '1 day' WHEN 'semanal' THEN interval '7 days'
    WHEN 'quinzenal' THEN interval '15 days' WHEN 'mensal' THEN interval '1 month'
    WHEN 'trimestral' THEN interval '3 months' WHEN 'anual' THEN interval '1 year'
    ELSE interval '1 month' END
$$;

CREATE TABLE public.ciclos_credito (
  ciclo text PRIMARY KEY CHECK (ciclo IN ('diario','semanal','quinzenal','mensal')),
  preco_km numeric NOT NULL DEFAULT 2.20,
  km_minimo numeric NOT NULL DEFAULT 10,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ciclos_credito TO anon, authenticated;
GRANT INSERT, UPDATE ON public.ciclos_credito TO authenticated;
GRANT ALL ON public.ciclos_credito TO service_role;
ALTER TABLE public.ciclos_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ciclos leitura" ON public.ciclos_credito FOR SELECT USING (true);
CREATE POLICY "ciclos equipe insere" ON public.ciclos_credito FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "ciclos equipe altera" ON public.ciclos_credito FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
INSERT INTO public.ciclos_credito (ciclo, preco_km) VALUES ('diario',2.20),('semanal',2.10),('quinzenal',2.00),('mensal',1.90);

CREATE TABLE public.pacotes_creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ciclo text NOT NULL CHECK (ciclo IN ('diario','semanal','quinzenal','mensal')),
  km numeric NOT NULL CHECK (km > 0),
  valor numeric NOT NULL CHECK (valor > 0),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pacotes_creditos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pacotes_creditos TO authenticated;
GRANT ALL ON public.pacotes_creditos TO service_role;
ALTER TABLE public.pacotes_creditos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacotes leitura" ON public.pacotes_creditos FOR SELECT USING (ativo OR public.is_staff());
CREATE POLICY "pacotes equipe insere" ON public.pacotes_creditos FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "pacotes equipe altera" ON public.pacotes_creditos FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "pacotes equipe exclui" ON public.pacotes_creditos FOR DELETE TO authenticated USING (public.is_staff());
INSERT INTO public.pacotes_creditos (nome, ciclo, km, valor) VALUES
 ('Diário 30 km','diario',30,66),('Semanal 150 km','semanal',150,315),
 ('Quinzenal 300 km','quinzenal',300,600),('Mensal 600 km','mensal',600,1140);

-- Pedido de pacote: valor sempre calculado no servidor; créditos só após pagamento aprovado (conceder_lote_plano).
CREATE OR REPLACE FUNCTION public.criar_pedido_pacote(_email text, _pacote uuid, _ciclo text, _km numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email)); pk pacotes_creditos; c ciclos_credito; v numeric; k numeric; ci text; pid uuid;
BEGIN
  IF position('@' in e) = 0 THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  IF _pacote IS NOT NULL THEN
    SELECT * INTO pk FROM pacotes_creditos WHERE id = _pacote AND ativo;
    IF pk.id IS NULL THEN RAISE EXCEPTION 'Pacote indisponível'; END IF;
    k := pk.km; v := pk.valor; ci := pk.ciclo;
  ELSE
    SELECT * INTO c FROM ciclos_credito WHERE ciclo = _ciclo;
    IF c.ciclo IS NULL THEN RAISE EXCEPTION 'Ciclo inválido'; END IF;
    k := round(coalesce(_km,0)); IF k < c.km_minimo THEN RAISE EXCEPTION 'Mínimo de % km', c.km_minimo; END IF;
    v := round(k * c.preco_km, 2); ci := c.ciclo;
  END IF;
  INSERT INTO pedidos_assinatura (cliente_email, modalidade, periodicidade, franquia_km, ciclos, valor, creditos)
  VALUES (e, 'Pacote de créditos', ci, k, 1, v, k) RETURNING id INTO pid;
  RETURN json_build_object('id', pid, 'km', k, 'valor', v, 'ciclo', ci);
END $$;
GRANT EXECUTE ON FUNCTION public.criar_pedido_pacote(text, uuid, text, numeric) TO anon, authenticated;