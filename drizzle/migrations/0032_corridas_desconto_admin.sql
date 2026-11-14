ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS valor_original numeric;
ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS desconto_por text;