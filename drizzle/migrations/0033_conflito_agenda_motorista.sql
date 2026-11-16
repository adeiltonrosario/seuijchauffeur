CREATE OR REPLACE FUNCTION public._ida_ts(_ida text) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _ida ~ '^\d{2}/\d{2}/\d{4} \d{2}:\d{2}$' THEN to_timestamp(_ida, 'DD/MM/YYYY HH24:MI')::timestamp END
$$;

CREATE OR REPLACE FUNCTION public.motorista_tem_conflito(_nome text, _ida text, _ignorar text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.corridas c
    WHERE c.motorista = _nome AND c.id <> _ignorar
      AND c.status IN ('confirmado','em-andamento')
      AND public._ida_ts(c.ida) IS NOT NULL AND public._ida_ts(_ida) IS NOT NULL
      AND abs(extract(epoch FROM public._ida_ts(c.ida) - public._ida_ts(_ida))) < 90*60
  )
$$;

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
  IF public.motorista_tem_conflito(_m.nome, _c.ida, _c.id) THEN RETURN 'conflito_agenda'; END IF;
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
  IF public.motorista_tem_conflito(_k.motorista_nome, _c.ida, _c.id) THEN RETURN 'conflito_agenda'; END IF;
  UPDATE public.corridas SET motorista = _k.motorista_nome, veiculo = _k.veiculo, categoria = _k.categoria,
    status = 'confirmado', atualizado_em = now() WHERE id = _c.id;
  UPDATE public.candidaturas_corrida SET status = CASE WHEN id = _k.id THEN 'selecionado' ELSE 'dispensado' END
    WHERE corrida_id = _c.id;
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.motorista_tem_conflito(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidatar_corrida(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_motorista(uuid) TO authenticated;