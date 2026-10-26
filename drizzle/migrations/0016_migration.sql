CREATE TABLE public.propostas_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_email text NOT NULL,
  modalidade text NOT NULL DEFAULT '',
  periodicidade text NOT NULL CHECK (periodicidade IN ('mensal','trimestral','anual')),
  viagens_mes integer NOT NULL DEFAULT 0,
  franquia_km numeric NOT NULL CHECK (franquia_km > 0),
  ciclos integer NOT NULL DEFAULT 1 CHECK (ciclos >= 1),
  valor numeric NOT NULL CHECK (valor > 0),
  observacao text,
  status text NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada','aguardando_pagamento','paga','cancelada')),
  pedido_id uuid,
  criado_por text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propostas_plano TO authenticated;
GRANT ALL ON public.propostas_plano TO service_role;
ALTER TABLE public.propostas_plano ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe gerencia propostas" ON public.propostas_plano FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "cliente ve suas propostas" ON public.propostas_plano FOR SELECT TO authenticated
  USING (cliente_email = public.email_logado());

CREATE OR REPLACE FUNCTION public.pagar_proposta(_proposta uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pr propostas_plano; pid uuid; e text := public.email_logado();
BEGIN
  IF e = '' THEN RAISE EXCEPTION 'Entre na sua conta para pagar a proposta'; END IF;
  SELECT * INTO pr FROM propostas_plano WHERE id = _proposta AND cliente_email = e FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
  IF pr.status IN ('paga','cancelada') THEN RAISE EXCEPTION 'Proposta indisponível'; END IF;
  IF pr.pedido_id IS NOT NULL AND EXISTS (SELECT 1 FROM pedidos_assinatura WHERE id = pr.pedido_id AND status = 'pendente') THEN
    RETURN pr.pedido_id;
  END IF;
  INSERT INTO pedidos_assinatura (cliente_email, modalidade, periodicidade, franquia_km, ciclos, valor)
  VALUES (e, pr.modalidade, pr.periodicidade, pr.franquia_km, pr.ciclos, pr.valor) RETURNING id INTO pid;
  UPDATE propostas_plano SET pedido_id = pid, status = 'aguardando_pagamento' WHERE id = pr.id;
  RETURN pid;
END $$;
REVOKE EXECUTE ON FUNCTION public.pagar_proposta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagar_proposta(uuid) TO authenticated;

-- planos públicos fechados: pedidos só via proposta
REVOKE EXECUTE ON FUNCTION public.criar_pedido_assinatura(text,text,text,numeric,integer,numeric,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.marcar_proposta_paga() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status IS DISTINCT FROM 'aprovado' THEN
    UPDATE propostas_plano SET status = 'paga' WHERE pedido_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proposta_paga AFTER UPDATE OF status ON public.pedidos_assinatura
  FOR EACH ROW EXECUTE FUNCTION public.marcar_proposta_paga();