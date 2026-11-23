# Ride Companion

# seuchauffeur

## Objetivo

Aplicativo de transporte em que clientes agendam corridas com motoristas, definindo pontos de embarque, parada e desembarque em datas e horários diferentes, com pagamento via Pix, cartão de crédito ou plano mensal. Os motoristas confirmam os agendamentos conforme sua disponibilidade e recebem o valor somente após a conclusão da corrida.

## Telas

### Agente de Suporte IA

**Rota:** `/agente-suporte`

**Objetivo:** Mediar automaticamente as conversas entre cliente e motorista, repassando mensagens, padrões de atendimento e eventualidades de forma ágil.

**Componentes:**

- **Painel de Conversas Ativas**: Exibe as conversas em andamento entre cliente e motorista intermediadas pela IA.

- **Cartão de Atendimento**: Exibe os dados do cliente, do motorista e da corrida agendada para contexto completo do atendimento.

- **Padrões de Atendimento**: Abre as diretrizes e scripts padronizados para orientar a comunicação da IA.

- **Chat Mediado pela IA**: Repassa automaticamente as mensagens entre motorista e cliente; quando o motorista informa que está a caminho, a IA envia o aviso ao cliente; o operador pode editar antes de enviar.

- **Botão de Repasse ao Cliente**: Envia comunicado sobre eventualidades (atraso, troca de veículo, cancelamento) ao cliente de forma automática.

- **Botão de Repasse ao Motorista**: Envia informações do cliente ou instruções de atendimento ao motorista de forma automática.

### Autenticação e Planos

**Rota:** `/`

**Objetivo:** Autenticar clientes e motoristas, permitir criação de conta e apresentar os planos disponíveis com QR Code que direciona novos clientes à landing page.

**Componentes:**

- **Input Email**: Recebe o e-mail do usuário para autenticação.

- **Input Senha**: Recebe a senha do usuário para autenticação.

- **Botão Entrar**: Autentica o usuário e redireciona para a tela inicial.

- **Botão Criar Conta**: Navega para o formulário de cadastro.

- **Alternador Cliente/Motorista**: Define o tipo de perfil de acesso.

- **Seção de Planos**: Exibe os planos disponíveis para novos clientes.

- **QR Code**: Ao ser escaneado, direciona novos clientes para a landing page.

### Mapa de Agendamentos

**Rota:** `/mapa`

**Objetivo:** Permitir acompanhar no mapa a localização de todos os motoristas e clientes conectados e seus agendamentos em blocos.

**Componentes:**

- **Mapa de localização**: Exibe em tempo real a localização de todos os motoristas e clientes conectados; ao tocar em um marcador, destaca o agendamento correspondente no bloco.

- **Legenda de marcadores**: Indica por cor e ícone quem é motorista e quem é cliente no mapa.

- **Blocos de agendamentos**: Lista vertical de blocos com os agendamentos ativos; ao tocar em um bloco, centraliza o mapa no participante correspondente.

- **Filtro de status**: Filtra os blocos e os marcadores por situação do agendamento, como pendente, confirmado ou em andamento.

- **Campo de busca**: Busca motoristas ou clientes pelo nome e destaca sua localização no mapa.

### Início do Cliente

**Rota:** `/cliente`

**Objetivo:** Exibir os próximos agendamentos do cliente e o acesso rápido ao agendamento de corridas.

**Componentes:**

- **Lista de Próximos Agendamentos**: Abre os detalhes do agendamento selecionado

- **Botão Agendar Corrida**: Navega para o formulário de agendamento

- **Seção de Motoristas Favoritos**: Navega para a lista de favoritos

- **Menu de Perfil**: Navega para a área do usuário

### Agendar Corrida

**Rota:** `/cliente/agendamento/novo`

**Objetivo:** Criar agendamentos de ida e retorno com embarque, parada, desembarque, datas, horários e valores acordados.

**Componentes:**

- **Input Endereço de Embarque**

- **Input Ponto de Parada**

- **Input Endereço de Desembarque**

- **Seleção de Datas e Horários**: Adiciona horários de ida e retorno e impede conflitos de agenda

- **Seleção de Modalidade**: Exibe as modalidades de corrida pré-definidas no sistema

- **Seleção de Forma de Pagamento**: Escolhe entre Pix, cartão de crédito ou plano mensal

- **Lista de Motoristas Disponíveis**: Seleciona o motorista e exibe o valor acordado

- **Botão Confirmar Agendamento**: Salva o agendamento e envia ao motorista

### Pagamento

**Rota:** `/cliente/pagamento`

**Objetivo:** Registrar o pagamento da corrida agendada por Pix, cartão de crédito ou plano mensal.

**Componentes:**

- **Opção Pix**: Gera o QR Code e a chave Pix para o pagamento

- **Opção Cartão de Crédito**: Processa o pagamento com cartão de crédito

- **Opção Plano Mensal**: Ativa a cobrança mensal recorrente

- **Resumo de Valores**

- **Botão Confirmar Pagamento**: Finaliza o pagamento da corrida agendada

### Detalhes do Agendamento

**Rota:** `/cliente/agendamentos/:id`

**Objetivo:** Visualizar e ajustar a corrida agendada, com acesso ao chat, à fidelização do motorista, à escolha do tipo de veículo e ao gerenciamento de ocupantes.

**Componentes:**

- **Detalhes da Corrida**: Exibe as informações da corrida agendada.

- **Status do Agendamento**: Mostra o status atual do agendamento.

- **Seleção de Tipo de Veículo**: Permite escolher o tipo de veículo que irá atender a corrida.

- **Gerenciamento de Ocupantes**: Permite incluir novos ocupantes respeitando a capacidade do veículo escolhido.

- **Botão Ajustar Rota**: Recalcula o valor acordado mediante mudança de rota.

- **Botão Abrir Chat**: Navega para a conversa com o motorista.

- **Botão Favoritar Motorista**: Envia convite de fidelização que depende da aceitação de ambos.

- **Botão Cancelar Agendamento**: Cancela a corrida agendada.

### Favoritos

**Rota:** `/favoritos`

**Objetivo:** Gerenciar a fidelização entre clientes e motoristas, sujeita à aceitação de ambas as partes.

**Componentes:**

- **Lista de Favoritos**: Abre o perfil do motorista ou cliente favorito

- **Convites Pendentes**: Permite aceitar ou recusar convites de fidelização

- **Botão Enviar Convite**: Envia convite de fidelização ao usuário

- **Botão Remover Favorito**: Remove o usuário da lista de favoritos

### Agendamentos do Motorista

**Rota:** `/motorista/agendamentos`

**Objetivo:** Exibir em lista vertical os agendamentos disponíveis para o motorista avaliar e confirmar interesse, sem poder trocar o veículo agendado, que só pode ser alterado mediante aceitação do cliente.

**Componentes:**

- **Alternador Disponível/Indisponível**: Define a disponibilidade do motorista para agendamentos.

- **Lista Vertical de Agendamentos**: Abre os detalhes para avaliar o interesse.

- **Filtro por Data**: Filtra as corridas agendadas por dia e horário.

### Detalhes do Agendamento do Motorista

**Rota:** `/motorista/agendamentos/:id`

**Objetivo:** Permitir ao motorista confirmar ou recusar o agendamento, atualizar o início da corrida, conversar com o cliente e concluir a corrida, com lembretes automáticos ao motorista e ao cliente.

**Componentes:**

- **Detalhes da Corrida**: Exibe as informações do agendamento da corrida.

- **Botão Confirmar Interesse**: Aceita o agendamento e libera o chat com o cliente.

- **Botão Recusar Agendamento**: Recusa o agendamento e o mantém disponível na lista.

- **Botão Abrir Chat**: Navega para a conversa com o cliente.

- **Botão Concluir Corrida**: Finaliza o agendamento e libera o pagamento do motorista.

- **Botão Atualizar Início da Corrida**: Registra o início da corrida pelo motorista; se não for atualizado até duas horas antes, o agendamento é liberado como prioridade para outro motorista.

- **Alerta de Lembrete do Agendamento**: Exibe lembretes do agendamento ao motorista e ao cliente.

### Meus Veículos

**Rota:** `/motorista/veiculos`

**Objetivo:** Cadastrar veículos com placa, cor, modelo, foto e categoria.

**Componentes:**

- **Formulário de Veículo**: Cadastra placa, cor e modelo do veículo

- **Upload de Foto do Veículo**: Envia a foto do veículo

- **Seleção de Categoria**: Escolhe entre sedan, SUV e hatch

- **Lista de Veículos Cadastrados**: Abre a edição do veículo

- **Botão Salvar Veículo**: Salva os dados do veículo

### Ganhos do Motorista

**Rota:** `/motorista/ganhos`

**Objetivo:** Exibir os valores liberados somente após a conclusão dos agendamentos e permitir saque.

**Componentes:**

- **Saldo Pendente de Liberação**

- **Lista de Pagamentos Liberados**: Exibe o histórico das corridas concluídas

- **Botão Solicitar Saque**: Solicita a transferência dos valores das corridas concluídas

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://seuijchauffeur.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/01402ff0-2faa-46d3-9356-15952322dbe1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
