CREATE TABLE public.pedidos_assinatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  modalidade text NOT NULL DEFAULT '',
  periodicidade text NOT NULL,
  franquia_km numeric NOT NULL DEFAULT 0,
  ciclos integer NOT NULL DEFAULT 1,
  valor numeric NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'aguardando_pagamento',
  provedor text NOT NULL DEFAULT 'mercadopago',
  provedor_pagamento_id text UNIQUE,
  codigo_indicacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pedidos_assinatura TO authenticated;
GRANT ALL ON public.pedidos_assinatura TO service_role;
ALTER TABLE public.pedidos_assinatura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve pedidos assinatura" ON public.pedidos_assinatura FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE public.carteira_km_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  tipo text NOT NULL,
  km numeric NOT NULL,
  saldo_anterior numeric NOT NULL,
  saldo_posterior numeric NOT NULL CHECK (saldo_posterior >= 0),
  pedido_id uuid,
  ciclo integer,
  agendamento_id text,
  origem text NOT NULL DEFAULT '',
  responsavel text,
  justificativa text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, ciclo, tipo)
);
GRANT SELECT ON public.carteira_km_movimentos TO authenticated;
GRANT ALL ON public.carteira_km_movimentos TO service_role;
ALTER TABLE public.carteira_km_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve carteira" ON public.carteira_km_movimentos FOR SELECT TO authenticated USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.criar_pedido_assinatura(_email text, _modalidade text, _periodicidade text, _franquia_km numeric, _ciclos integer, _valor numeric, _codigo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pid uuid; e text := lower(trim(_email));
BEGIN
  IF position('@' in e) = 0 THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  IF _valor <= 0 OR _franquia_km <= 0 OR _ciclos < 1 THEN RAISE EXCEPTION 'Pedido inválido'; END IF;
  INSERT INTO pedidos_assinatura (cliente_email, modalidade, periodicidade, franquia_km, ciclos, valor, codigo_indicacao)
  VALUES (e, coalesce(_modalidade,''), _periodicidade, _franquia_km, _ciclos, _valor, nullif(upper(trim(_codigo)),''))
  RETURNING id INTO pid;
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.status_pedido_assinatura(_id uuid, _email text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT status FROM pedidos_assinatura WHERE id = _id AND cliente_email = lower(trim(_email))
$$;

CREATE OR REPLACE FUNCTION public.saldo_carteira_km(_email text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT json_build_object(
    'saldo', coalesce((SELECT saldo_posterior FROM carteira_km_movimentos WHERE cliente_email = lower(trim(_email)) ORDER BY criado_em DESC, id DESC LIMIT 1), 0),
    'movimentos', coalesce((SELECT json_agg(m ORDER BY m.criado_em DESC) FROM (SELECT tipo, km, saldo_anterior, saldo_posterior, origem, criado_em FROM carteira_km_movimentos WHERE cliente_email = lower(trim(_email)) ORDER BY criado_em DESC LIMIT 50) m), '[]'::json))
$$;

-- Concede franquia somente após pagamento aprovado (chamado apenas pelo backend com service_role). Idempotente por pedido+ciclo. Km nunca expiram.
CREATE OR REPLACE FUNCTION public.conceder_franquia_pedido(_pedido uuid, _ciclo integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p pedidos_assinatura; ant numeric;
BEGIN
  SELECT * INTO p FROM pedidos_assinatura WHERE id = _pedido FOR UPDATE;
  IF p.id IS NULL THEN RETURN 'pedido inexistente'; END IF;
  IF p.status <> 'aprovado' THEN RETURN 'pagamento não aprovado'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p.cliente_email));
  IF EXISTS (SELECT 1 FROM carteira_km_movimentos WHERE pedido_id = _pedido AND ciclo = _ciclo AND tipo = 'franquia') THEN RETURN 'ja concedido'; END IF;
  SELECT coalesce((SELECT saldo_posterior FROM carteira_km_movimentos WHERE cliente_email = p.cliente_email ORDER BY criado_em DESC, id DESC LIMIT 1), 0) INTO ant;
  INSERT INTO carteira_km_movimentos (cliente_email, tipo, km, saldo_anterior, saldo_posterior, pedido_id, ciclo, origem)
  VALUES (p.cliente_email, 'franquia', p.franquia_km, ant, ant + p.franquia_km, _pedido, _ciclo, 'Pagamento aprovado ' || p.provedor);
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.conceder_franquia_pedido(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_franquia_pedido(uuid, integer) TO service_role;