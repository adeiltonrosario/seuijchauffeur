CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone_whatsapp text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO anon, authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso demonstracao clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  email text NOT NULL DEFAULT '',
  telefone_whatsapp text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','ativo','suspenso','bloqueado')),
  motivo_status text,
  alterado_por text,
  veiculo text NOT NULL DEFAULT '',
  placa text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'Sedan',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  ajudantes integer NOT NULL DEFAULT 0,
  valor_ajudante numeric(10,2) NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO anon, authenticated;
GRANT ALL ON public.motoristas TO service_role;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso demonstracao motoristas" ON public.motoristas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.veiculos (
  id text PRIMARY KEY,
  motorista text,
  placa text NOT NULL,
  modelo text NOT NULL,
  cor text NOT NULL,
  categoria text NOT NULL,
  capacidade integer NOT NULL DEFAULT 4,
  renavam text NOT NULL DEFAULT '',
  numero_crlv text NOT NULL DEFAULT '',
  exercicio_crlv text NOT NULL DEFAULT '',
  cnh_numero text NOT NULL DEFAULT '',
  cnh_categoria text NOT NULL DEFAULT 'B',
  cnh_validade text NOT NULL DEFAULT '',
  cnh_ear boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','suspenso','rejeitado')),
  origem text NOT NULL DEFAULT 'solicitacao' CHECK (origem IN ('solicitacao','frota')),
  aprovador text,
  motivo text,
  decidido_em timestamptz,
  em_uso boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO anon, authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso demonstracao veiculos" ON public.veiculos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);