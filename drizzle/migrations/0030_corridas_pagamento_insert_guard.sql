CREATE OR REPLACE FUNCTION public.proteger_pagamento_corrida_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')) THEN
    NEW.pagamento_status := 'pendente'; NEW.pago_em := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_proteger_pagamento_corrida_ins ON public.corridas;
CREATE TRIGGER trg_proteger_pagamento_corrida_ins BEFORE INSERT ON public.corridas FOR EACH ROW EXECUTE FUNCTION public.proteger_pagamento_corrida_insert();