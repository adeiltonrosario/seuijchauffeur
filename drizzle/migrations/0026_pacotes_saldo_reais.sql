ALTER TABLE public.pacotes_creditos ADD COLUMN IF NOT EXISTS saldo_credito numeric NOT NULL DEFAULT 0;
UPDATE public.pacotes_creditos SET saldo_credito = round(valor * CASE ciclo WHEN 'diario' THEN 1.05 WHEN 'semanal' THEN 1.10 WHEN 'quinzenal' THEN 1.15 ELSE 1.20 END, 2) WHERE saldo_credito = 0;
COMMENT ON COLUMN public.pacotes_creditos.km IS 'DEPRECATED: pacotes agora liberam saldo em reais (saldo_credito); 1 crédito = R$ 1,00';

CREATE OR REPLACE FUNCTION public.criar_pedido_pacote(_email text, _pacote uuid, _ciclo text, _km numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email)); pk pacotes_creditos; c ciclos_credito; v numeric; s numeric; ci text; pid uuid;
BEGIN
  IF position('@' in e) = 0 THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  IF _pacote IS NOT NULL THEN
    SELECT * INTO pk FROM pacotes_creditos WHERE id = _pacote AND ativo;
    IF pk.id IS NULL THEN RAISE EXCEPTION 'Pacote indisponível'; END IF;
    v := pk.valor; s := greatest(pk.saldo_credito, pk.valor); ci := pk.ciclo;
  ELSE
    -- Personalizado: _km recebe o valor em reais que o cliente quer carregar (sem bônus).
    SELECT * INTO c FROM ciclos_credito WHERE ciclo = _ciclo;
    IF c.ciclo IS NULL THEN RAISE EXCEPTION 'Ciclo inválido'; END IF;
    v := round(coalesce(_km,0), 2);
    IF v < round(c.km_minimo * c.preco_km, 2) THEN RAISE EXCEPTION 'Valor mínimo de R$ %', round(c.km_minimo * c.preco_km, 2); END IF;
    s := v; ci := c.ciclo;
  END IF;
  INSERT INTO pedidos_assinatura (cliente_email, modalidade, periodicidade, franquia_km, ciclos, valor, creditos)
  VALUES (e, 'Pacote de créditos', ci, 0, 1, v, s) RETURNING id INTO pid;
  RETURN json_build_object('id', pid, 'saldo', s, 'valor', v, 'ciclo', ci);
END $$;