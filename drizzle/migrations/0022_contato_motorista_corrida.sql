CREATE OR REPLACE FUNCTION public.contato_motorista_corrida(_corrida text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _email text := public.email_logado(); _c public.corridas; _k public.candidaturas_corrida; _m public.motoristas;
BEGIN
  SELECT * INTO _c FROM public.corridas WHERE id = _corrida;
  IF NOT FOUND OR _email = '' OR lower(_c.cliente_email) <> _email THEN RETURN NULL; END IF;
  SELECT * INTO _k FROM public.candidaturas_corrida WHERE corrida_id = _corrida AND status = 'selecionado' LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO _m FROM public.motoristas WHERE lower(email) = lower(_k.motorista_email) LIMIT 1;
  RETURN json_build_object('nome', _k.motorista_nome, 'veiculo', _k.veiculo, 'placa', _k.placa,
    'categoria', _k.categoria, 'whatsapp', coalesce(_m.telefone_whatsapp, ''));
END $$;
REVOKE ALL ON FUNCTION public.contato_motorista_corrida(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.contato_motorista_corrida(text) TO authenticated;