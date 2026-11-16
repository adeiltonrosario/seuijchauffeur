
DROP POLICY IF EXISTS "acesso demonstracao clientes" ON public.clientes;
CREATE POLICY "clientes cadastro" ON public.clientes FOR INSERT TO anon, authenticated WITH CHECK (email <> '' AND telefone_whatsapp <> '');
CREATE POLICY "clientes leem proprio" ON public.clientes FOR SELECT TO authenticated USING (public.is_staff() OR lower(email) = lower(public.email_logado()));
CREATE POLICY "clientes alteram proprio" ON public.clientes FOR UPDATE TO authenticated USING (public.is_staff() OR lower(email) = lower(public.email_logado())) WITH CHECK (public.is_staff() OR lower(email) = lower(public.email_logado()));
CREATE POLICY "equipe exclui clientes" ON public.clientes FOR DELETE TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "acesso demonstracao motoristas" ON public.motoristas;
CREATE POLICY "motoristas cadastro" ON public.motoristas FOR INSERT TO anon, authenticated WITH CHECK (status = 'pendente' OR public.is_staff());
CREATE POLICY "motoristas leem proprio" ON public.motoristas FOR SELECT TO authenticated USING (public.is_staff() OR lower(email) = lower(public.email_logado()));
CREATE POLICY "motoristas alteram proprio" ON public.motoristas FOR UPDATE TO authenticated USING (public.is_staff() OR lower(email) = lower(public.email_logado())) WITH CHECK (public.is_staff() OR lower(email) = lower(public.email_logado()));
CREATE POLICY "equipe exclui motoristas" ON public.motoristas FOR DELETE TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "atualizar veiculos" ON public.veiculos;
CREATE POLICY "atualizar veiculos" ON public.veiculos FOR UPDATE TO authenticated
USING (public.is_staff() OR motorista IN (SELECT m.nome FROM public.motoristas m WHERE lower(m.email) = lower(public.email_logado())))
WITH CHECK (public.is_staff() OR motorista IN (SELECT m.nome FROM public.motoristas m WHERE lower(m.email) = lower(public.email_logado())));

DROP POLICY IF EXISTS "atualizar corridas" ON public.corridas;
CREATE POLICY "atualizar corridas" ON public.corridas FOR UPDATE TO authenticated
USING (public.is_staff() OR lower(cliente_email) = lower(public.email_logado()) OR motorista IN (SELECT m.nome FROM public.motoristas m WHERE lower(m.email) = lower(public.email_logado())))
WITH CHECK (status = ANY (ARRAY['aguardando_motorista','pendente','confirmado','em-andamento','concluido','cancelado']) AND (public.is_staff() OR lower(cliente_email) = lower(public.email_logado()) OR motorista IN (SELECT m.nome FROM public.motoristas m WHERE lower(m.email) = lower(public.email_logado()))));
