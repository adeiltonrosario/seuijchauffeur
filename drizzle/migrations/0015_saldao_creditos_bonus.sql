CREATE TABLE public.ofertas_saldao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  quantidade_total numeric NOT NULL CHECK (quantidade_total > 0),
  disponivel numeric NOT NULL CHECK (disponivel >= 0),
  preco_unitario numeric NOT NULL CHECK (preco_unitario > 0),
  validade_dias integer NOT NULL DEFAULT 30 CHECK (validade_dias > 0),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada')),
  termina_em timestamptz,
  criado_por text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (disponivel <= quantidade_total)
);
GRANT SELECT ON public.ofertas_saldao TO authenticated;
GRANT ALL ON public.ofertas_saldao TO service_role;
ALTER TABLE public.ofertas_saldao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve ofertas saldao" ON public.ofertas_saldao FOR SELECT TO authenticated USING (public.is_staff());

CREATE TABLE public.compras_saldao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.ofertas_saldao(id),
  cliente_email text NOT NULL,
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  valor numeric NOT NULL CHECK (valor >= 0),
  status text NOT NULL DEFAULT 'aguardando_pagamento' CHECK (status IN ('aguardando_pagamento','aprovado','creditado','expirada','cancelada')),
  reserva_expira_em timestamptz NOT NULL,
  provedor text NOT NULL DEFAULT 'mercadopago',
  provedor_pagamento_id text,
  lote_id uuid REFERENCES public.credito_lotes(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compras_saldao_abertas ON public.compras_saldao (reserva_expira_em) WHERE status = 'aguardando_pagamento';
GRANT SELECT ON public.compras_saldao TO authenticated;
GRANT ALL ON public.compras_saldao TO service_role;
ALTER TABLE public.compras_saldao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve compras saldao" ON public.compras_saldao FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "cliente ve proprias compras saldao" ON public.compras_saldao FOR SELECT TO authenticated USING (cliente_email = public.email_logado());

CREATE OR REPLACE FUNCTION public._devolver_reserva_saldao(_compra uuid, _novo_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c compras_saldao; o ofertas_saldao;
BEGIN
  SELECT * INTO c FROM compras_saldao WHERE id = _compra FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'aguardando_pagamento' THEN RETURN; END IF;
  SELECT * INTO o FROM ofertas_saldao WHERE id = c.oferta_id FOR UPDATE;
  UPDATE compras_saldao SET status = _novo_status, atualizado_em = now() WHERE id = c.id;
  IF o.status = 'ativa' AND (o.termina_em IS NULL OR o.termina_em > now()) THEN
    UPDATE ofertas_saldao SET disponivel = disponivel + c.quantidade WHERE id = o.id;
  ELSE
    INSERT INTO carteira_admin_movimentos (tipo, quantidade, ref, chave, descricao)
    VALUES ('liberacao_oferta', c.quantidade, o.id::text, 'dev:' || c.id, 'Reserva não paga devolvida (' || o.titulo || ')')
    ON CONFLICT (chave) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._encerrar_oferta_saldao(_oferta uuid, _responsavel text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o ofertas_saldao;
BEGIN
  SELECT * INTO o FROM ofertas_saldao WHERE id = _oferta FOR UPDATE;
  IF o.id IS NULL OR o.status <> 'ativa' THEN RETURN; END IF;
  UPDATE ofertas_saldao SET status = 'encerrada', disponivel = 0 WHERE id = o.id;
  IF o.disponivel > 0 THEN
    INSERT INTO carteira_admin_movimentos (tipo, quantidade, ref, chave, responsavel, descricao)
    VALUES ('liberacao_oferta', o.disponivel, o.id::text, 'enc:' || o.id, _responsavel, 'Oferta encerrada: ' || o.titulo)
    ON CONFLICT (chave) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.liberar_reservas_saldao()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id FROM compras_saldao WHERE status = 'aguardando_pagamento' AND reserva_expira_em <= now() FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._devolver_reserva_saldao(r.id, 'expirada');
    n := n + 1;
  END LOOP;
  FOR r IN SELECT id FROM ofertas_saldao WHERE status = 'ativa' AND termina_em IS NOT NULL AND termina_em <= now() FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._encerrar_oferta_saldao(r.id, 'sistema');
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.criar_oferta_saldao(_titulo text, _quantidade numeric, _preco_unitario numeric, _validade_dias integer, _termina_em timestamptz)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE disp numeric; oid uuid; quem text := public.email_logado();
BEGIN
  IF NOT public.is_staff() THEN RETURN json_build_object('ok', false, 'erro', 'Sem permissão'); END IF;
  IF coalesce(trim(_titulo),'') = '' THEN RETURN json_build_object('ok', false, 'erro', 'Informe o nome da oferta'); END IF;
  IF _quantidade IS NULL OR _quantidade <= 0 OR _quantidade <> trunc(_quantidade) THEN RETURN json_build_object('ok', false, 'erro', 'Quantidade deve ser um número inteiro maior que zero'); END IF;
  IF _preco_unitario IS NULL OR _preco_unitario <= 0 THEN RETURN json_build_object('ok', false, 'erro', 'Informe o preço por crédito'); END IF;
  IF _validade_dias IS NULL OR _validade_dias <= 0 THEN RETURN json_build_object('ok', false, 'erro', 'Informe a validade em dias'); END IF;
  IF _termina_em IS NOT NULL AND _termina_em <= now() THEN RETURN json_build_object('ok', false, 'erro', 'A data de término precisa ser no futuro'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('saldao-estoque'));
  SELECT coalesce(sum(quantidade),0) INTO disp FROM carteira_admin_movimentos;
  IF _quantidade > disp THEN RETURN json_build_object('ok', false, 'erro', 'Estoque insuficiente', 'disponivel', disp); END IF;
  INSERT INTO ofertas_saldao (titulo, quantidade_total, disponivel, preco_unitario, validade_dias, termina_em, criado_por)
  VALUES (trim(_titulo), _quantidade, _quantidade, round(_preco_unitario, 2), _validade_dias, _termina_em, quem) RETURNING id INTO oid;
  INSERT INTO carteira_admin_movimentos (tipo, quantidade, ref, chave, responsavel, descricao)
  VALUES ('reserva_oferta', -_quantidade, oid::text, 'res:' || oid, quem, 'Oferta criada: ' || trim(_titulo));
  RETURN json_build_object('ok', true, 'id', oid);
END $$;

CREATE OR REPLACE FUNCTION public.encerrar_oferta_saldao(_oferta uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RETURN json_build_object('ok', false, 'erro', 'Sem permissão'); END IF;
  PERFORM public._encerrar_oferta_saldao(_oferta, public.email_logado());
  RETURN json_build_object('ok', true);
END $$;

-- Disponibilidade calculada na hora: reservas vencidas já contam como disponíveis.
CREATE OR REPLACE FUNCTION public.vitrine_saldao()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(json_agg(o ORDER BY o.criado_em DESC), '[]'::json) FROM (
    SELECT * FROM (
      SELECT f.id, f.titulo, f.quantidade_total, f.preco_unitario, f.validade_dias, f.termina_em, f.criado_em,
        f.disponivel + coalesce((SELECT sum(c.quantidade) FROM compras_saldao c WHERE c.oferta_id = f.id AND c.status = 'aguardando_pagamento' AND c.reserva_expira_em <= now()),0) AS disponivel
      FROM ofertas_saldao f WHERE f.status = 'ativa' AND (f.termina_em IS NULL OR f.termina_em > now())
    ) v WHERE v.disponivel > 0
  ) o
$$;

CREATE OR REPLACE FUNCTION public.reservar_compra_saldao(_oferta uuid, _quantidade numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e text := public.email_logado(); o ofertas_saldao; cid uuid; v numeric; exp timestamptz := now() + interval '30 minutes';
BEGIN
  IF e = '' THEN RETURN json_build_object('ok', false, 'erro', 'Entre na sua conta'); END IF;
  IF _quantidade IS NULL OR _quantidade <= 0 OR _quantidade <> trunc(_quantidade) THEN RETURN json_build_object('ok', false, 'erro', 'Quantidade inválida'); END IF;
  PERFORM public.liberar_reservas_saldao();
  SELECT * INTO o FROM ofertas_saldao WHERE id = _oferta FOR UPDATE;
  IF o.id IS NULL OR o.status <> 'ativa' OR (o.termina_em IS NOT NULL AND o.termina_em <= now()) THEN
    RETURN json_build_object('ok', false, 'erro', 'Oferta encerrada');
  END IF;
  IF EXISTS (SELECT 1 FROM compras_saldao WHERE oferta_id = o.id AND cliente_email = e AND status = 'aguardando_pagamento') THEN
    RETURN json_build_object('ok', false, 'erro', 'Você já tem uma reserva aguardando pagamento nesta oferta');
  END IF;
  IF _quantidade > o.disponivel THEN RETURN json_build_object('ok', false, 'erro', 'Quantidade maior que a disponível', 'disponivel', o.disponivel); END IF;
  v := round(_quantidade * o.preco_unitario, 2);
  UPDATE ofertas_saldao SET disponivel = disponivel - _quantidade WHERE id = o.id;
  INSERT INTO compras_saldao (oferta_id, cliente_email, quantidade, valor, reserva_expira_em)
  VALUES (o.id, e, _quantidade, v, exp) RETURNING id INTO cid;
  RETURN json_build_object('ok', true, 'id', cid, 'valor', v, 'expira_em', exp);
END $$;

CREATE OR REPLACE FUNCTION public.cancelar_compra_saldao(_compra uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e text := public.email_logado();
BEGIN
  IF e = '' THEN RETURN json_build_object('ok', false, 'erro', 'Entre na sua conta'); END IF;
  IF NOT EXISTS (SELECT 1 FROM compras_saldao WHERE id = _compra AND cliente_email = e AND status = 'aguardando_pagamento') THEN
    RETURN json_build_object('ok', false, 'erro', 'Reserva não encontrada');
  END IF;
  PERFORM public._devolver_reserva_saldao(_compra, 'cancelada');
  RETURN json_build_object('ok', true);
END $$;

-- Só concede depois que o pagamento foi aprovado pelo provedor (status alterado apenas pelo servidor).
CREATE OR REPLACE FUNCTION public.conceder_compra_saldao(_compra uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c compras_saldao; o ofertas_saldao; lid uuid;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.is_staff()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO c FROM compras_saldao WHERE id = _compra FOR UPDATE;
  IF c.id IS NULL THEN RETURN 'compra inexistente'; END IF;
  IF c.status = 'creditado' THEN RETURN 'ja concedido'; END IF;
  IF c.status <> 'aprovado' THEN RETURN 'pagamento não aprovado'; END IF;
  SELECT * INTO o FROM ofertas_saldao WHERE id = c.oferta_id;
  INSERT INTO credito_lotes (cliente_email, origem, origem_ref, quantidade, saldo, vence_em)
  VALUES (c.cliente_email, 'saldao', c.id::text, c.quantidade, c.quantidade, now() + make_interval(days => o.validade_dias))
  RETURNING id INTO lid;
  INSERT INTO credito_transacoes (cliente_email, lote_id, tipo, quantidade, ref, chave, descricao)
  VALUES (c.cliente_email, lid, 'concessao', c.quantidade, c.id::text, 'saldao:' || c.id, 'Saldão: ' || o.titulo);
  INSERT INTO carteira_admin_movimentos (tipo, quantidade, ref, chave, descricao) VALUES
    ('liberacao_oferta', c.quantidade, c.id::text, 'venda-lib:' || c.id, 'Saída da oferta para venda'),
    ('venda', -c.quantidade, c.id::text, 'venda:' || c.id, 'Vendido a ' || c.cliente_email || ' (' || o.titulo || ')');
  UPDATE compras_saldao SET status = 'creditado', lote_id = lid, atualizado_em = now() WHERE id = c.id;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.minhas_compras_saldao()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(json_agg(x ORDER BY x.criado_em DESC), '[]'::json) FROM (
    SELECT c.id, o.titulo, c.quantidade, c.valor,
      CASE WHEN c.status = 'aguardando_pagamento' AND c.reserva_expira_em <= now() THEN 'expirada' ELSE c.status END AS status,
      c.reserva_expira_em, c.criado_em
    FROM compras_saldao c JOIN ofertas_saldao o ON o.id = c.oferta_id
    WHERE public.email_logado() <> '' AND c.cliente_email = public.email_logado()
    ORDER BY c.criado_em DESC LIMIT 50
  ) x
$$;

CREATE OR REPLACE FUNCTION public.painel_saldao_admin()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN json_build_object(
    'ofertas', coalesce((SELECT json_agg(o ORDER BY o.criado_em DESC) FROM (
      SELECT f.id, f.titulo, f.quantidade_total, f.disponivel, f.preco_unitario, f.validade_dias, f.status, f.termina_em, f.criado_em,
        coalesce((SELECT sum(quantidade) FROM compras_saldao WHERE oferta_id = f.id AND status = 'aguardando_pagamento'),0) AS reservado,
        coalesce((SELECT sum(quantidade) FROM compras_saldao WHERE oferta_id = f.id AND status = 'creditado'),0) AS vendido,
        coalesce((SELECT sum(valor) FROM compras_saldao WHERE oferta_id = f.id AND status = 'creditado'),0) AS receita
      FROM ofertas_saldao f ORDER BY f.criado_em DESC LIMIT 100) o), '[]'::json),
    'compras', coalesce((SELECT json_agg(c ORDER BY c.criado_em DESC) FROM (
      SELECT c.id, o.titulo, c.cliente_email, c.quantidade, c.valor, c.status, c.reserva_expira_em, c.criado_em
      FROM compras_saldao c JOIN ofertas_saldao o ON o.id = c.oferta_id ORDER BY c.criado_em DESC LIMIT 100) c), '[]'::json)
  );
END $$;

REVOKE ALL ON FUNCTION public._devolver_reserva_saldao(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._encerrar_oferta_saldao(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.liberar_reservas_saldao() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_oferta_saldao(text, numeric, numeric, integer, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.encerrar_oferta_saldao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reservar_compra_saldao(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_compra_saldao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.conceder_compra_saldao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.minhas_compras_saldao() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.painel_saldao_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liberar_reservas_saldao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_oferta_saldao(text, numeric, numeric, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encerrar_oferta_saldao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_compra_saldao(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_compra_saldao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conceder_compra_saldao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.minhas_compras_saldao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.painel_saldao_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vitrine_saldao() TO anon, authenticated;

-- Junta a devolução de reservas vencidas à verificação de vencimentos que já roda de hora em hora.
SELECT cron.schedule('expirar-creditos-hora', '5 * * * *', $$SELECT public.expirar_creditos(NULL); SELECT public.liberar_reservas_saldao();$$);