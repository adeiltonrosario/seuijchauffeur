CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expirar-creditos-hora', '5 * * * *', $$SELECT public.expirar_creditos(NULL)$$);