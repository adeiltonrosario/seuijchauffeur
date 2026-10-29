ALTER TABLE public.corridas ALTER COLUMN motorista SET DEFAULT '';
DROP POLICY IF EXISTS "criar corridas" ON public.corridas;
CREATE POLICY "criar corridas" ON public.corridas FOR INSERT WITH CHECK (status IN ('pendente','aguardando_motorista'));
DROP POLICY IF EXISTS "atualizar corridas" ON public.corridas;
CREATE POLICY "atualizar corridas" ON public.corridas FOR UPDATE USING (true)
  WITH CHECK (status = ANY (ARRAY['aguardando_motorista','pendente','confirmado','em-andamento','concluido','cancelado']));

CREATE TABLE public.candidaturas_corrida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id text NOT NULL REFERENCES public.corridas(id) ON DELETE CASCADE,
  motorista_email text NOT NULL,
  motorista_nome text NOT NULL,
  veiculo text NOT NULL DEFAULT '',
  placa text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (corrida_id, motorista_email)
);
GRANT SELECT ON public.candidaturas_corrida TO authenticated;
GRANT ALL ON public.candidaturas_corrida TO service_role;
ALTER TABLE public.candidaturas_corrida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver candidaturas" ON public.candidaturas_corrida FOR SELECT TO authenticated
USING (
  lower(motorista_email) = lower(public.email_logado())
  OR public.is_staff()
  OR EXISTS (SELECT 1 FROM public.corridas c WHERE c.id = corrida_id AND lower(c.cliente_email) = lower(public.email_logado()))
);

CREATE OR REPLACE FUNCTION public.candidatar_corrida(_corrida text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := public.email_logado(); _m public.motoristas; _c public.corridas;
BEGIN
  IF _email IS NULL OR _email = '' THEN RETURN 'login_necessario'; END IF;
  SELECT * INTO _m FROM public.motoristas WHERE lower(email) = lower(_email) LIMIT 1;
  IF NOT FOUND THEN RETURN 'nao_motorista'; END IF;
  IF _m.status <> 'ativo' THEN RETURN 'motorista_inativo'; END IF;
  SELECT * INTO _c FROM public.corridas WHERE id = _corrida FOR UPDATE;
  IF NOT FOUND THEN RETURN 'corrida_inexistente'; END IF;
  IF _c.status <> 'aguardando_motorista' THEN RETURN 'corrida_fechada'; END IF;
  INSERT INTO public.candidaturas_corrida(corrida_id, motorista_email, motorista_nome, veiculo, placa, categoria)
  VALUES (_corrida, lower(_m.email), _m.nome, _m.veiculo, _m.placa, _m.categoria)
  ON CONFLICT (corrida_id, motorista_email) DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.vincular_motorista(_candidatura uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := public.email_logado(); _k public.candidaturas_corrida; _c public.corridas;
BEGIN
  SELECT * INTO _k FROM public.candidaturas_corrida WHERE id = _candidatura;
  IF NOT FOUND THEN RETURN 'candidatura_inexistente'; END IF;
  SELECT * INTO _c FROM public.corridas WHERE id = _k.corrida_id FOR UPDATE;
  IF _email IS NULL OR lower(_c.cliente_email) <> lower(_email) THEN RETURN 'sem_permissao'; END IF;
  IF _c.status <> 'aguardando_motorista' THEN RETURN 'corrida_fechada'; END IF;
  UPDATE public.corridas SET motorista = _k.motorista_nome, veiculo = _k.veiculo, categoria = _k.categoria,
    status = 'confirmado', atualizado_em = now() WHERE id = _c.id;
  UPDATE public.candidaturas_corrida SET status = CASE WHEN id = _k.id THEN 'selecionado' ELSE 'dispensado' END
    WHERE corrida_id = _c.id;
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.candidatar_corrida(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_motorista(uuid) TO authenticated;