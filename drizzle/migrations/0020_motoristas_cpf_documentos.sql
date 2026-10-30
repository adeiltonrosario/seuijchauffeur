ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS cpf text NOT NULL DEFAULT '';
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS cnh text NOT NULL DEFAULT '';
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS documentos jsonb NOT NULL DEFAULT '{}'::jsonb;