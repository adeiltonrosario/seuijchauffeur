CREATE TYPE public.app_role AS ENUM ('admin', 'gerente');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver os proprios papeis" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
$$;

-- Primeiro administrador: só funciona enquanto não houver nenhum admin.
CREATE OR REPLACE FUNCTION public.reivindicar_primeiro_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.reivindicar_primeiro_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reivindicar_primeiro_admin() TO authenticated;

-- Motoristas: só staff altera status/autoria; novos cadastros ficam pendentes.
CREATE OR REPLACE FUNCTION public.proteger_status_motorista()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pendente'; NEW.alterado_por := NULL; NEW.motivo_status := NULL;
  ELSE
    NEW.status := OLD.status; NEW.alterado_por := OLD.alterado_por; NEW.motivo_status := OLD.motivo_status;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proteger_status_motorista BEFORE INSERT OR UPDATE ON public.motoristas
FOR EACH ROW EXECUTE FUNCTION public.proteger_status_motorista();

-- Veículos: só staff aprova/decide; demais gravações ficam pendentes.
CREATE OR REPLACE FUNCTION public.proteger_status_veiculo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pendente'; NEW.aprovador := NULL; NEW.motivo := NULL; NEW.decidido_em := NULL;
  ELSE
    NEW.status := OLD.status; NEW.aprovador := OLD.aprovador; NEW.motivo := OLD.motivo; NEW.decidido_em := OLD.decidido_em;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proteger_status_veiculo BEFORE INSERT OR UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.proteger_status_veiculo();

-- Exclusão de veículos apenas por staff.
DROP POLICY IF EXISTS "acesso demonstracao veiculos" ON public.veiculos;
CREATE POLICY "leitura veiculos" ON public.veiculos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "inserir veiculos" ON public.veiculos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "atualizar veiculos" ON public.veiculos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "excluir veiculos staff" ON public.veiculos FOR DELETE TO authenticated USING (public.is_staff());