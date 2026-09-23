# Características das modalidades de corrida

Cada modalidade de corrida passa a ter um texto de características: o que o serviço inclui e como cliente e motorista devem proceder no embarque e no desembarque.

## Administração (/admin, aba "Modalidades e valores")

- No formulário de nova modalidade, um campo de texto grande "Características e procedimentos" (embarque, desembarque, regras do serviço).
- Na tabela de valores, o mesmo texto fica editável para cada modalidade já existente, junto de valor base e por km.
- As cinco modalidades atuais (Executivo aeroporto, Corrida assistida, Viagem corporativa, City tour, Escolar recorrente) começam com um texto padrão descrevendo o procedimento de embarque e desembarque de cada uma, para o admin ajustar.

## Onde cliente e motorista veem

- Agendar corrida (/cliente/agendamento/novo): ao escolher a modalidade, as características aparecem logo abaixo da seleção, antes de confirmar.
- Detalhe da corrida do cliente (/cliente/agendamentos/:id): bloco "Como proceder" com as características da modalidade daquela corrida.
- Detalhe da corrida do motorista (/motorista/agendamentos/:id): o mesmo bloco, para o motorista conferir antes de iniciar.

## Detalhes técnicos

- `src/lib/dados.ts`: trocar `modalidades: string[]` por objetos `{ nome, caracteristicas }` e exportar um helper `caracteristicasDaModalidade(nome)` para as telas de detalhe (que só guardam o nome no agendamento).
- Ajustar os usos atuais de `modalidades` (admin e cliente.agendamento.novo) para a nova forma; o campo `modalidade` do agendamento continua string.
- Campo novo usa `Textarea` do shadcn; estado local com `useState`, sem backend (dados de demonstração, como no resto do app).
