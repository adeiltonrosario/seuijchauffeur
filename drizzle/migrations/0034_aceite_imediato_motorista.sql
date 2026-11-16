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
  INSERT INTO public.candidaturas_corrida(corrida_id, motorista_email, motorista_nome, veiculo, placa, categoria, status)
  VALUES (_corrida, lower(_m.email), _m.nome, _m.veiculo, _m.placa, _m.categoria, 'selecionado')
  ON CONFLICT (corrida_id, motorista_email) DO UPDATE SET status = 'selecionado';
  UPDATE public.candidaturas_corrida SET status = 'dispensado'
    WHERE corrida_id = _corrida AND motorista_email <> lower(_m.email);
  UPDATE public.corridas SET motorista = _m.nome, veiculo = _m.veiculo, categoria = _m.categoria,
    status = 'confirmado', atualizado_em = now() WHERE id = _corrida;
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.candidatar_corrida(text) TO authenticated;