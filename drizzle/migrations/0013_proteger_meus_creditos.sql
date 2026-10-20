CREATE OR REPLACE FUNCTION public.meus_creditos(_email text)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE v text := lower(trim(_email)); r json;
BEGIN
  IF v IS DISTINCT FROM lower(coalesce(public.email_logado(),'')) AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  SELECT json_build_object(
    'carteira', coalesce((SELECT sum(saldo) FROM credito_lotes WHERE cliente_email = v AND local='carteira' AND status='ativo' AND vence_em > now()),0),
    'cofre', coalesce((SELECT sum(saldo) FROM credito_lotes WHERE cliente_email = v AND local='cofre' AND status='ativo' AND vence_em > now()),0),
    'consumido', coalesce((SELECT -sum(quantidade) FROM credito_transacoes WHERE cliente_email = v AND tipo='consumo'),0),
    'expirado', coalesce((SELECT -sum(quantidade) FROM credito_transacoes WHERE cliente_email = v AND tipo='expiracao'),0),
    'enviado_cofre', coalesce((SELECT -sum(quantidade) FROM credito_transacoes WHERE cliente_email = v AND tipo='cofre_saida'),0),
    'lotes', coalesce((SELECT json_agg(l ORDER BY l.vence_em) FROM (SELECT id, local, origem, quantidade, saldo, status, concedido_em, vence_em FROM credito_lotes WHERE cliente_email = v ORDER BY vence_em DESC LIMIT 100) l),'[]'::json),
    'transacoes', coalesce((SELECT json_agg(t ORDER BY t.criado_em DESC) FROM (SELECT tipo, quantidade, descricao, criado_em FROM credito_transacoes WHERE cliente_email = v ORDER BY criado_em DESC LIMIT 100) t),'[]'::json),
    'config', (SELECT row_to_json(c) FROM credito_config c)
  ) INTO r;
  RETURN r;
END $f$;
REVOKE EXECUTE ON FUNCTION public.meus_creditos(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.meus_creditos(text) TO authenticated;