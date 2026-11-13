ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS pagamento_status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS pago_em timestamptz;
CREATE OR REPLACE FUNCTION public.proteger_pagamento_corrida() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pagamento_status IS DISTINCT FROM OLD.pagamento_status
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')) THEN
    RAISE EXCEPTION 'Somente a equipe pode confirmar pagamentos';
  END IF;
  IF NEW.pagamento_status = 'aprovado' AND OLD.pagamento_status IS DISTINCT FROM 'aprovado' THEN NEW.pago_em := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_proteger_pagamento_corrida ON public.corridas;
CREATE TRIGGER trg_proteger_pagamento_corrida BEFORE UPDATE ON public.corridas FOR EACH ROW EXECUTE FUNCTION public.proteger_pagamento_corrida();