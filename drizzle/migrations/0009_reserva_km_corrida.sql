CREATE OR REPLACE FUNCTION public.reservar_km_corrida(_email text, _agendamento text, _km numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e text := lower(trim(_email)); ant numeric; usado numeric;
BEGIN
  IF e = '' OR _km IS NULL OR _km <= 0 OR coalesce(trim(_agendamento),'') = '' THEN
    RETURN json_build_object('ok', false, 'erro', 'dados inválidos');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(e));
  IF EXISTS (SELECT 1 FROM carteira_km_movimentos WHERE cliente_email = e AND agendamento_id = _agendamento AND tipo = 'reserva') THEN
    RETURN json_build_object('ok', false, 'erro', 'agendamento já reservado');
  END IF;
  SELECT coalesce((SELECT saldo_posterior FROM carteira_km_movimentos WHERE cliente_email = e ORDER BY criado_em DESC, id DESC LIMIT 1), 0) INTO ant;
  usado := least(ant, round(_km, 1));
  IF usado <= 0 THEN
    RETURN json_build_object('ok', true, 'coberto', 0, 'excedente', round(_km,1), 'saldo', ant);
  END IF;
  INSERT INTO carteira_km_movimentos (cliente_email, tipo, km, saldo_anterior, saldo_posterior, agendamento_id, origem)
  VALUES (e, 'reserva', -usado, ant, ant - usado, _agendamento, 'Reserva para corrida ' || _agendamento);
  RETURN json_build_object('ok', true, 'coberto', usado, 'excedente', round(_km,1) - usado, 'saldo', ant - usado);
END $$;
REVOKE EXECUTE ON FUNCTION public.reservar_km_corrida(text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_km_corrida(text, text, numeric) TO anon, authenticated;