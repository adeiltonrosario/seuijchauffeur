<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Approval fields (motoristas.status, veiculos.status/aprovador) are protected by DB triggers that only accept changes from admin/gerente roles in user_roles; why: client-side approval cannot be trusted.
- Créditos de plano só são liberados no servidor após pagamento aprovado pelo provedor; quilômetros acumulados nunca expiram e renovações somam ao saldo.
- Saldão bonus credits come only from conceder_compra_saldao after the server marks the purchase 'aprovado'; reservations expire lazily (vitrine derives availability) plus the hourly cron backstop; why: clients cannot self-approve and no sub-hourly polling.
- Ride driver assignment: bookings start as 'aguardando_motorista'; drivers apply via candidatar_corrida and only the booking's client links one via vincular_motorista (security definer RPCs); why: client choice must be enforced server-side.
