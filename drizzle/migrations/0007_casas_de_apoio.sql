CREATE TABLE public.casas_de_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text NOT NULL,
  municipio text NOT NULL DEFAULT 'Salvador',
  telefone text NOT NULL DEFAULT '',
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.casas_de_apoio TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.casas_de_apoio TO authenticated;
GRANT ALL ON public.casas_de_apoio TO service_role;
ALTER TABLE public.casas_de_apoio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler casas ativas" ON public.casas_de_apoio FOR SELECT TO anon, authenticated USING (ativa OR public.is_staff());
CREATE POLICY "staff insere casas" ON public.casas_de_apoio FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "staff altera casas" ON public.casas_de_apoio FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff exclui casas" ON public.casas_de_apoio FOR DELETE TO authenticated USING (public.is_staff());

CREATE TABLE public.solicitantes_casa_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  cargo text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  casa_nome_informado text NOT NULL DEFAULT '',
  casa_id uuid REFERENCES public.casas_de_apoio(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  aprovador text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitantes_casa_apoio TO authenticated;
GRANT ALL ON public.solicitantes_casa_apoio TO service_role;
ALTER TABLE public.solicitantes_casa_apoio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff gerencia solicitantes" ON public.solicitantes_casa_apoio FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.pedidos_casa_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_email text NOT NULL,
  casa_id uuid NOT NULL REFERENCES public.casas_de_apoio(id),
  data_hora text NOT NULL,
  ida_e_volta boolean NOT NULL DEFAULT true,
  ar_condicionado boolean NOT NULL DEFAULT false,
  pacientes jsonb NOT NULL DEFAULT '[]'::jsonb,
  categoria text NOT NULL DEFAULT 'Sedan',
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_casa_apoio TO authenticated;
GRANT ALL ON public.pedidos_casa_apoio TO service_role;
ALTER TABLE public.pedidos_casa_apoio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff gerencia pedidos casa" ON public.pedidos_casa_apoio FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE OR REPLACE FUNCTION public.solicitar_acesso_casa_apoio(_email text, _nome text, _cargo text, _whatsapp text, _casa text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e text := lower(trim(_email));
BEGIN
  IF e = '' OR position('@' in e) = 0 THEN RETURN 'E-mail inválido.'; END IF;
  IF coalesce(trim(_nome),'') = '' OR coalesce(trim(_casa),'') = '' THEN RETURN 'Informe seu nome e a Casa de Apoio.'; END IF;
  IF EXISTS (SELECT 1 FROM solicitantes_casa_apoio WHERE email = e) THEN RETURN 'Já existe uma solicitação para este e-mail.'; END IF;
  INSERT INTO solicitantes_casa_apoio (email, nome, cargo, whatsapp, casa_nome_informado)
  VALUES (e, trim(_nome), coalesce(_cargo,''), coalesce(_whatsapp,''), trim(_casa));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.acesso_casa_apoio(_email text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT json_build_object('status', s.status, 'nome', s.nome,
    'casa', CASE WHEN s.status = 'aprovado' AND c.id IS NOT NULL THEN json_build_object('id', c.id, 'nome', c.nome, 'endereco', c.endereco, 'municipio', c.municipio, 'telefone', c.telefone) END)
  FROM solicitantes_casa_apoio s LEFT JOIN casas_de_apoio c ON c.id = s.casa_id AND c.ativa
  WHERE s.email = lower(trim(_email))
$$;

CREATE OR REPLACE FUNCTION public.criar_pedido_casa_apoio(_email text, _data_hora text, _ida_e_volta boolean, _ar boolean, _pacientes jsonb, _categoria text, _valor numeric)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid;
BEGIN
  SELECT s.casa_id INTO cid FROM solicitantes_casa_apoio s JOIN casas_de_apoio c ON c.id = s.casa_id AND c.ativa
  WHERE s.email = lower(trim(_email)) AND s.status = 'aprovado';
  IF cid IS NULL THEN RETURN 'Acesso não liberado pelo administrador.'; END IF;
  IF jsonb_array_length(coalesce(_pacientes,'[]'::jsonb)) = 0 THEN RETURN 'Inclua ao menos um paciente.'; END IF;
  INSERT INTO pedidos_casa_apoio (solicitante_email, casa_id, data_hora, ida_e_volta, ar_condicionado, pacientes, categoria, valor)
  VALUES (lower(trim(_email)), cid, _data_hora, _ida_e_volta, _ar, _pacientes, coalesce(_categoria,'Sedan'), greatest(_valor,0));
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.solicitar_acesso_casa_apoio(text,text,text,text,text), public.acesso_casa_apoio(text), public.criar_pedido_casa_apoio(text,text,boolean,boolean,jsonb,text,numeric) TO anon, authenticated;