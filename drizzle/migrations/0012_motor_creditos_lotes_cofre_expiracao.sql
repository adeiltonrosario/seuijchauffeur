
CREATE TABLE public.credito_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  taxa_cofre numeric NOT NULL DEFAULT 1,
  creditos_por_km numeric NOT NULL DEFAULT 2,
  preco_credito numeric NOT NULL DEFAULT 1,
  validade_cofre_meses integer NOT NULL DEFAULT 2,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credito_config TO anon, authenticated;
GRANT UPDATE ON public.credito_config TO authenticated;
GRANT ALL ON public.credito_config TO service_role;
ALTER TABLE public.credito_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler config creditos" ON public.credito_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff altera config creditos" ON public.credito_config FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
INSERT INTO public.credito_config (id) VALUES (true);

ALTER TABLE public.pedidos_assinatura ADD COLUMN creditos numeric;

CREATE TABLE public.credito_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  local text NOT NULL DEFAULT 'carteira' CHECK (local IN ('carteira','cofre')),
  origem text NOT NULL CHECK (origem IN ('plano','saldao','bonus','ajuste','cofre')),
  origem_ref text,
  lote_pai uuid REFERENCES public.credito_lotes(id),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  saldo numeric NOT NULL CHECK (saldo >= 0),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','esgotado','expirado')),
  concedido_em timestamptz NOT NULL DEFAULT now(),
  vence_em timestamptz NOT NULL,
  CHECK (saldo <= quantidade)
);
CREATE UNIQUE INDEX credito_lotes_origem_ref ON public.credito_lotes (origem, origem_ref) WHERE origem_ref IS NOT NULL;
CREATE INDEX credito_lotes_cliente ON public.credito_lotes (cliente_email, local, vence_em);
GRANT SELECT ON public.credito_lotes TO authenticated;
GRANT ALL ON public.credito_lotes TO service_role;
ALTER TABLE public.credito_lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve lotes" ON public.credito_lotes FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE public.credito_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  lote_id uuid REFERENCES public.credito_lotes(id),
  tipo text NOT NULL CHECK (tipo IN ('concessao','consumo','cofre_saida','cofre_entrada','taxa_cofre','expiracao','estorno','ajuste')),
  quantidade numeric NOT NULL,
  ref text,
  chave text UNIQUE,
  responsavel text,
  descricao text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credito_transacoes_cliente ON public.credito_transacoes (cliente_email, criado_em DESC);
GRANT SELECT ON public.credito_transacoes TO authenticated;
GRANT ALL ON public.credito_transacoes TO service_role;
ALTER TABLE public.credito_transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve transacoes" ON public.credito_transacoes FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE public.carteira_admin_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada_expiracao','reserva_oferta','liberacao_oferta','venda','bonus','ajuste')),
  quantidade numeric NOT NULL,
  lote_origem uuid REFERENCES public.credito_lotes(id),
  ref text,
  chave text UNIQUE,
  responsavel text,
  descricao text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.carteira_admin_movimentos TO authenticated;
GRANT ALL ON public.carteira_admin_movimentos TO service_role;
ALTER TABLE public.carteira_admin_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve carteira admin" ON public.carteira_admin_movimentos FOR SELECT TO authenticated USING (public.is_staff());

-- Histórico protegido: sem UPDATE/DELETE em ledgers
CREATE OR REPLACE FUNCTION public.bloquear_alteracao_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Histórico de créditos não pode ser alterado'; END $$;
CREATE TRIGGER trg_ledger_cliente BEFORE UPDATE OR DELETE ON public.credito_transacoes FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_ledger();
CREATE TRIGGER trg_ledger_admin BEFORE UPDATE OR DELETE ON public.carteira_admin_movimentos FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_ledger();

CREATE OR REPLACE FUNCTION public.vencimento_periodo(_base timestamptz, _periodicidade text)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT _base + CASE _periodicidade WHEN 'mensal' THEN interval '1 month' WHEN 'trimestral' THEN interval '3 months' WHEN 'anual' THEN interval '1 year' ELSE interval '1 month' END
$$;

-- Concede lote do plano após pagamento aprovado (idempotente)
CREATE OR REPLACE FUNCTION public.conceder_lote_plano(_pedido uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p pedidos_assinatura; cfg credito_config; qtd numeric; lid uuid;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.is_staff()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO p FROM pedidos_assinatura WHERE id = _pedido FOR UPDATE;
  IF p.id IS NULL THEN RETURN 'pedido inexistente'; END IF;
  IF p.status <> 'aprovado' THEN RETURN 'pagamento não aprovado'; END IF;
  IF EXISTS (SELECT 1 FROM credito_lotes WHERE origem = 'plano' AND origem_ref = _pedido::text) THEN RETURN 'ja concedido'; END IF;
  SELECT * INTO cfg FROM credito_config;
  qtd := coalesce(p.creditos, round(p.valor / nullif(cfg.preco_credito,0)));
  IF qtd IS NULL OR qtd <= 0 THEN RETURN 'quantidade inválida'; END IF;
  INSERT INTO credito_lotes (cliente_email, origem, origem_ref, quantidade, saldo, vence_em)
  VALUES (p.cliente_email, 'plano', _pedido::text, qtd, qtd, public.vencimento_periodo(now(), p.periodicidade))
  RETURNING id INTO lid;
  INSERT INTO credito_transacoes (cliente_email, lote_id, tipo, quantidade, ref, chave, descricao)
  VALUES (p.cliente_email, lid, 'concessao', qtd, _pedido::text, 'plano:' || _pedido, 'Plano ' || p.periodicidade || ' aprovado');
  RETURN 'ok';
END $$;

-- Expiração idempotente: lote vencido sai do cliente e entra na carteira administrativa
CREATE OR REPLACE FUNCTION public.expirar_creditos(_email text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l credito_lotes; n integer := 0;
BEGIN
  FOR l IN SELECT * FROM credito_lotes
    WHERE status = 'ativo' AND vence_em <= now() AND (_email IS NULL OR cliente_email = lower(trim(_email)))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE credito_lotes SET status = 'expirado', saldo = 0 WHERE id = l.id;
    IF l.saldo > 0 THEN
      INSERT INTO credito_transacoes (cliente_email, lote_id, tipo, quantidade, chave, descricao)
      VALUES (l.cliente_email, l.id, 'expiracao', -l.saldo, 'exp:' || l.id, 'Créditos vencidos (' || l.local || ')')
      ON CONFLICT (chave) DO NOTHING;
      INSERT INTO carteira_admin_movimentos (tipo, quantidade, lote_origem, chave, descricao)
      VALUES ('entrada_expiracao', l.saldo, l.id, 'exp:' || l.id, 'Expirado de ' || l.cliente_email)
      ON CONFLICT (chave) DO NOTHING;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.email_logado() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT lower(trim(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- Debita lotes por prioridade (carteira→cofre, vencimento mais próximo, mais antigo). Uso interno.
CREATE OR REPLACE FUNCTION public._debitar_lotes(_email text, _qtd numeric, _locais text[], _tipo text, _ref text, _desc text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l credito_lotes; falta numeric := _qtd; tira numeric;
BEGIN
  FOR l IN SELECT * FROM credito_lotes
    WHERE cliente_email = _email AND status = 'ativo' AND vence_em > now() AND saldo > 0 AND local = ANY(_locais)
    ORDER BY array_position(_locais, local), vence_em, concedido_em FOR UPDATE
  LOOP
    EXIT WHEN falta <= 0;
    tira := least(l.saldo, falta);
    UPDATE credito_lotes SET saldo = saldo - tira, status = CASE WHEN saldo - tira = 0 THEN 'esgotado' ELSE status END WHERE id = l.id;
    INSERT INTO credito_transacoes (cliente_email, lote_id, tipo, quantidade, ref, descricao) VALUES (_email, l.id, _tipo, -tira, _ref, _desc);
    falta := falta - tira;
  END LOOP;
  IF falta > 0 THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
END $$;
REVOKE ALL ON FUNCTION public._debitar_lotes(text, numeric, text[], text, text, text) FROM PUBLIC, anon, authenticated;

-- Consumo de viagem (exige cliente logado, idempotente por referência)
CREATE OR REPLACE FUNCTION public.consumir_creditos(_ref text, _quantidade numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := public.email_logado(); disp numeric;
BEGIN
  IF e = '' THEN RETURN json_build_object('ok', false, 'erro', 'Entre na sua conta'); END IF;
  IF _quantidade IS NULL OR _quantidade <= 0 OR coalesce(trim(_ref),'') = '' THEN RETURN json_build_object('ok', false, 'erro', 'Dados inválidos'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('cred:' || e));
  PERFORM public.expirar_creditos(e);
  IF EXISTS (SELECT 1 FROM credito_transacoes WHERE cliente_email = e AND tipo = 'consumo' AND ref = _ref) THEN
    RETURN json_build_object('ok', false, 'erro', 'Esta viagem já foi debitada');
  END IF;
  SELECT coalesce(sum(saldo),0) INTO disp FROM credito_lotes WHERE cliente_email = e AND status = 'ativo' AND vence_em > now();
  IF disp < _quantidade THEN RETURN json_build_object('ok', false, 'erro', 'Saldo insuficiente', 'disponivel', disp); END IF;
  PERFORM public._debitar_lotes(e, _quantidade, ARRAY['carteira','cofre'], 'consumo', _ref, 'Viagem ' || _ref);
  RETURN json_build_object('ok', true, 'debitado', _quantidade, 'saldo', disp - _quantidade);
END $$;

-- Transferência para o Cofre: taxa única, validade própria a partir de agora
CREATE OR REPLACE FUNCTION public.transferir_para_cofre(_quantidade numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := public.email_logado(); cfg credito_config; disp numeric; lid uuid; venc timestamptz; ref text := gen_random_uuid()::text;
BEGIN
  IF e = '' THEN RETURN json_build_object('ok', false, 'erro', 'Entre na sua conta'); END IF;
  SELECT * INTO cfg FROM credito_config;
  IF _quantidade IS NULL OR _quantidade <= cfg.taxa_cofre THEN RETURN json_build_object('ok', false, 'erro', 'A quantidade precisa ser maior que a taxa de ' || cfg.taxa_cofre || ' crédito'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('cred:' || e));
  PERFORM public.expirar_creditos(e);
  SELECT coalesce(sum(saldo),0) INTO disp FROM credito_lotes WHERE cliente_email = e AND local = 'carteira' AND status = 'ativo' AND vence_em > now();
  IF disp < _quantidade THEN RETURN json_build_object('ok', false, 'erro', 'Saldo insuficiente na carteira', 'disponivel', disp); END IF;
  PERFORM public._debitar_lotes(e, _quantidade, ARRAY['carteira'], 'cofre_saida', ref, 'Envio ao Cofre');
  venc := now() + make_interval(months => cfg.validade_cofre_meses);
  INSERT INTO credito_lotes (cliente_email, local, origem, origem_ref, quantidade, saldo, vence_em)
  VALUES (e, 'cofre', 'cofre', ref, _quantidade - cfg.taxa_cofre, _quantidade - cfg.taxa_cofre, venc) RETURNING id INTO lid;
  INSERT INTO credito_transacoes (cliente_email, lote_id, tipo, quantidade, ref, descricao)
  VALUES (e, lid, 'cofre_entrada', _quantidade - cfg.taxa_cofre, ref, 'Entrada no Cofre'),
         (e, NULL, 'taxa_cofre', 0, ref, 'Taxa de ' || cfg.taxa_cofre || ' crédito retida da transferência');
  RETURN json_build_object('ok', true, 'cofre', _quantidade - cfg.taxa_cofre, 'taxa', cfg.taxa_cofre, 'vence_em', venc);
END $$;

-- Extrato do cliente
CREATE OR REPLACE FUNCTION public.meus_creditos(_email text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH e AS (SELECT lower(trim(_email)) AS v)
  SELECT json_build_object(
    'carteira', coalesce((SELECT sum(saldo) FROM credito_lotes, e WHERE cliente_email = e.v AND local='carteira' AND status='ativo' AND vence_em > now()),0),
    'cofre', coalesce((SELECT sum(saldo) FROM credito_lotes, e WHERE cliente_email = e.v AND local='cofre' AND status='ativo' AND vence_em > now()),0),
    'consumido', coalesce((SELECT -sum(quantidade) FROM credito_transacoes, e WHERE cliente_email = e.v AND tipo='consumo'),0),
    'expirado', coalesce((SELECT -sum(quantidade) FROM credito_transacoes, e WHERE cliente_email = e.v AND tipo='expiracao'),0),
    'enviado_cofre', coalesce((SELECT -sum(quantidade) FROM credito_transacoes, e WHERE cliente_email = e.v AND tipo='cofre_saida'),0),
    'lotes', coalesce((SELECT json_agg(l ORDER BY l.vence_em) FROM (SELECT id, local, origem, quantidade, saldo, status, concedido_em, vence_em FROM credito_lotes, e WHERE cliente_email = e.v ORDER BY vence_em DESC LIMIT 100) l),'[]'::json),
    'transacoes', coalesce((SELECT json_agg(t ORDER BY t.criado_em DESC) FROM (SELECT tipo, quantidade, descricao, criado_em FROM credito_transacoes, e WHERE cliente_email = e.v ORDER BY criado_em DESC LIMIT 100) t),'[]'::json),
    'config', (SELECT row_to_json(c) FROM credito_config c)
  )
$$;

-- Painel da Carteira Administrativa
CREATE OR REPLACE FUNCTION public.painel_carteira_admin()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN json_build_object(
    'recebido_expiracao', coalesce((SELECT sum(quantidade) FROM carteira_admin_movimentos WHERE tipo='entrada_expiracao'),0),
    'reservado', coalesce((SELECT sum(CASE tipo WHEN 'reserva_oferta' THEN -quantidade WHEN 'liberacao_oferta' THEN -quantidade ELSE 0 END) FROM carteira_admin_movimentos),0),
    'vendido', coalesce((SELECT -sum(quantidade) FROM carteira_admin_movimentos WHERE tipo='venda'),0),
    'bonus', coalesce((SELECT -sum(quantidade) FROM carteira_admin_movimentos WHERE tipo='bonus'),0),
    'disponivel', coalesce((SELECT sum(quantidade) FROM carteira_admin_movimentos),0),
    'movimentos', coalesce((SELECT json_agg(m ORDER BY m.criado_em DESC) FROM (SELECT tipo, quantidade, lote_origem, descricao, responsavel, criado_em FROM carteira_admin_movimentos ORDER BY criado_em DESC LIMIT 100) m),'[]'::json)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.meus_creditos(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_creditos(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_para_cofre(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.painel_carteira_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_lote_plano(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_creditos(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.expirar_creditos(text) FROM anon;
