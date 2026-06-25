# Seven Marketing Manager - TODO

- [x] Schema do banco de dados completo (clientes, colaboradores, tarefas, financeiro, documentos)
- [x] Migração SQL aplicada no banco
- [x] DB helpers para todas as entidades
- [x] Routers tRPC para clientes (CRUD completo)
- [x] Routers tRPC para colaboradores (CRUD completo)
- [x] Routers tRPC para tarefas/kanban
- [x] Routers tRPC para financeiro
- [x] Routers tRPC para documentos/upload S3
- [x] Routers tRPC para dashboard KPIs
- [x] Routers tRPC para notificações
- [x] Tema visual premium (laranja/branco/neutros) com CSS variables
- [x] DashboardLayout com sidebar de navegação
- [x] Página Dashboard com KPIs e gráficos
- [x] Página Clientes com listagem e CRUD
- [x] Página Detalhes do Cliente com abas (serviços, entregas, financeiro, observações, documentos)
- [x] Página Colaboradores com listagem e CRUD
- [x] Página Kanban com drag-and-drop
- [x] Página Financeiro Geral com gráficos e relatórios
- [x] Sistema de notificações para o owner
- [x] Upload de documentos para S3
- [x] Responsividade mobile
- [x] Testes vitest

## Expansão v2

- [x] Logo Seven Marketing na sidebar (CDN)
- [x] Schema: tabela events (calendário)
- [x] Schema: tabela notifications (in-app)
- [x] Migração SQL aplicada
- [x] DB helpers para events e notifications
- [x] Routers tRPC para events CRUD
- [x] Routers tRPC para notifications (listar, marcar lida)
- [x] Router: alertas de vencimento de pagamentos
- [x] Router: resumo semanal automático
- [x] Frontend: sistema de notificações (ícone sino) no header
- [x] Frontend: alertas de vencimento no dashboard (verde/amarelo/vermelho)
- [x] Frontend: resumo semanal no dashboard
- [x] Frontend: página Calendário com visualização dia/semana/mês
- [x] Frontend: criar/editar/excluir eventos no calendário
- [x] Frontend: integração tarefas com prazo no calendário
- [x] Frontend: drag-and-drop de eventos no calendário
- [x] Frontend: cores por tipo de atividade
- [x] Testes vitest para novos routers

## Expansão v3 - Controle Financeiro Avançado

- [x] Backend: router faturamento previsto (soma valores clientes ativos no mês)
- [x] Backend: router faturamento real (soma pagamentos marcados como pago)
- [x] Backend: router valor pendente (previsto - real)
- [x] Backend: ação confirmar pagamento (marcar como pago)
- [x] Backend: ação desfazer pagamento (voltar para pendente)
- [x] Backend: exclusão inteligente de cliente (remover registros financeiros vinculados)
- [x] Backend: exclusão de pagamento remove do faturamento real
- [x] Frontend: KPIs no dashboard (previsto/real/pendente)
- [x] Frontend: página Financeiro Detalhado com lista de clientes e status
- [x] Frontend: separação visual pagamentos pendentes vs recebidos
- [x] Frontend: botão confirmar pagamento
- [x] Frontend: botão desfazer pagamento
- [x] Frontend: atualização em tempo real dos valores
- [x] Calendário: corrigir seleção de clientes no novo evento (combobox com busca)
- [x] Testes vitest para novos routers financeiros (34 testes passando)

## Correções v4

- [x] Bug: valor fantasma R$ 1.000 na Receita Total - pagamento órfão removido do banco + cascade fix
- [x] Bug: clientes não aparecem no dropdown do calendário - corrigido campo name para companyName
- [x] Feature: adicionar data de pagamento nos colaboradores (dia do mês + indicadores verde/amarelo/vermelho)

## Expansão v5 - Gráficos Profissionais, Exportação e Identidade Visual

- [x] Bug: dados fantasmas "Cobrança #" no dashboard (corrigido com INNER JOIN + nome do cliente)
- [x] Bug: gráfico Receita vs Despesas (novo gráfico de linha profissional com 3 linhas)
- [x] Backend: campo logoUrl na tabela clients para logo da empresa
- [x] Backend: campo photoUrl na tabela collaborators para foto de perfil
- [x] Backend: router upload de imagem (logo/foto) via S3
- [x] Backend: router exportação CSV/Excel/PDF (exportData)
- [x] Frontend: gráfico de linha profissional (receita/despesa/lucro) com tooltips e valores
- [x] Frontend: alertas de vencimento mostrando SOMENTE dados reais com nome do cliente e logo
- [x] Frontend: botão exportar dados (CSV, Excel, PDF)
- [x] Frontend: upload e exibição de logo nos clientes
- [x] Frontend: upload e exibição de foto nos colaboradores
- [x] Frontend: avatar com iniciais quando não houver imagem
- [x] Testes vitest para novos routers (38 testes passando)

## Correções v6

- [x] Bug: datas de vencimento no dashboard mostram datas erradas (corrigido timezone UTC)

## Melhoria v7 - Gráficos Premium

- [x] Dashboard: gráfico de linha sofisticado com múltiplas linhas (receita/despesa/lucro), faixas alternadas, tooltips avançados
- [x] Financeiro: gráfico de linha premium com mesmo estilo
- [x] Visual: linhas coloridas (laranja receita, cyan despesa, azul lucro), fundo com faixas alternadas
- [x] Funcionalidades: tooltips ricos, valores nos pontos, curvas suaves, gradientes

## Correções e Expansão v8

- [ ] Bug: corrigir valor de pagamento Supergasbras Rocio (R$ 1.000 → R$ 700) - PULADO (corrigir via Management UI)
- [x] Feature: controle de vídeos/imagens por cliente (schema + db helpers + routers + frontend + testes)
- [ ] Feature: integração com Google Calendar (sincronização bidirecional + notificações diárias)
  - [ ] Configurar OAuth2 do Google (client_id, client_secret, redirect_uri)
  - [ ] Criar endpoints tRPC para sincronizar eventos
  - [ ] Adicionar botão "Conectar Google Calendar" no módulo Calendário
  - [ ] Implementar sincronização bidirecional (criar/editar/deletar eventos)
  - [ ] Notificações diárias sobre compromissos

## Expansão v9 - Análise de Despesas com Gráfico de Pizza

- [x] Feature: Gráfico de pizza profissional para análise de despesas por categoria
  - [x] Componente ExpensesPieChart com Recharts
  - [x] Agregação de despesas por categoria (Colaborador, Software, Marketing, Operacional, Outro)
  - [x] Cálculo de percentuais e valores totais
  - [x] Tabela de resumo com cores por categoria
  - [x] Tooltips ricos com backdrop blur
  - [x] Labels com percentuais nas fatias
  - [x] Aba "Análise de Despesas" no módulo Financeiro
  - [x] 8 testes passando para lógica de análise
- [x] Testes: 51 testes passando (8 novos testes de análise de despesas)

## Expansão v10 - Análise Detalhada de Despesas por Descrição

- [x] Feature: Gráfico de pizza detalhado com base em descrições específicas (Mercado, Água, Luz, Internet, etc.)
  - [x] Agregação por descrição com fallback para categoria
  - [x] Botões de visualização: "Detalhada" vs "Por Categoria"
  - [x] Cores específicas para cada tipo de despesa (Mercado, Água, Luz, Internet, Aluguel, Combustível, etc.)
  - [x] Tabela de resumo com nomenclaturas específicas
  - [x] Tooltips com informações detalhadas
  - [x] Labels com percentuais nas fatias
  - [x] 5 novos testes para agregação por descrição
- [x] Testes: 56 testes passando (13 testes de análise detalhada de despesas)

## Expansão v11 - Refatoração Financeira Robusta

- [ ] Feature: Aba de Despesas com dados precisos (sem recálculos automáticos)
  - [ ] Garantir que valores sejam exibidos exatamente como inseridos
  - [ ] Remover qualquer lógica de transformação de dados
  - [ ] Validar precisão em testes

- [ ] Feature: Aba de Investimentos (renda fixa vs renda variável)
  - [ ] Criar schema: investments table com tipo (fixed/variable)
  - [ ] DB helpers para CRUD de investimentos
  - [ ] Routers tRPC para investimentos
  - [ ] Interface com categorização clara
  - [ ] Cálculo de total por tipo de investimento

- [ ] Feature: Aba de Cartão de Crédito (com lógica de impacto no pagamento)
  - [ ] Criar schema: creditCard table com status (pending/paid)
  - [ ] Lógica: não impacta faturamento até pagamento
  - [ ] DB helpers para CRUD de cartão
  - [ ] Routers tRPC para cartão
  - [ ] Interface com filtro por status (pendente/pago)
  - [ ] Cálculo de total a pagar

- [ ] Testes: Validar precisão de dados e lógica de cartão de crédito


## Expansão v13 - Correção de Agregação de Despesas

- [ ] Corrigir lógica de agregação no ExpensesPieChart para refletir fielmente lançamentos
- [ ] Garantir que resumo detalhado não tenha duplicações ou transformações
- [ ] Validar que "Placa de vídeo" exibe R$ 800,00 (não R$ 1.100,00)
- [ ] Validar que "Dizimo e Oferta" exibe R$ 1.100,00 (agregação correta)
- [ ] Escrever testes para fidelidade de dados
- [ ] Verificar interface e confirmar correções

## Expansão v12 - Próximas Prioridades

- [ ] Feature: Integração com Google Calendar
  - [ ] OAuth2 do Google
  - [ ] Sincronização bidirecional de eventos
  - [ ] Notificações diárias

- [ ] Feature: Filtro por período nas abas financeiras
  - [ ] Seletor de mês/ano nas abas Investimentos e Cartão de Crédito
  - [ ] Comparação de períodos

- [ ] Feature: Exportação de relatórios PDF
  - [ ] Relatório de Despesas com gráfico e tabela
  - [ ] Relatório de Investimentos por tipo
  - [ ] Relatório de Cartão de Crédito (pendente vs pago)


## Expansão v13 - Correção de Fidelidade de Dados de Despesas

- [x] Analisar e corrigir lógica de agregação no ExpensesPieChart
- [x] Garantir que resumo detalhado não tenha duplicações ou transformações
- [x] Validar que "Placa de video" exibe R$ 800,00 (corrigido de R$ 1.100,00)
- [x] Validar que "Dizimo e Oferta" exibe R$ 1.366,30 (agregação correta de 6 lançamentos)
- [x] Normalizar descrições: "Oferta" → "Dizimo e Oferta", "Dízimo e Oferta" → "Dizimo e Oferta"
- [x] Deletar lançamento duplicado de R$ 300,00 de "Placa de video"
- [x] Verificar interface e confirmar correções


## Expansão v14 - Sistema de Organização Mensal

- [ ] Criar schema para períodos mensais (monthlyPeriod table)
- [ ] Implementar lógica de criação automática de abas mensais
- [ ] Criar DB helpers para gerenciar períodos
- [ ] Criar routers tRPC para períodos mensais
- [ ] Refatorar Financial com abas dinâmicas por mês
- [ ] Implementar migração de dados entre períodos
- [ ] Escrever testes para lógica mensal
- [ ] Validar que histórico anterior é preservado
- [ ] Salvar checkpoint com sistema mensal completo


## Expansão v14 - Sistema de Organização Mensal (COMPLETO)

- [x] Criar schema para períodos mensais (monthlyPeriod + monthlyFinancialSummary tables)
- [x] Implementar lógica de criação automática de abas mensais (getOrCreateMonthlyPeriod)
- [x] Criar DB helpers para gerenciar períodos (12 funções CRUD completas)
- [x] Criar routers tRPC para períodos mensais (monthlyPeriodsRouter)
- [x] Refatorar Financial com MonthlyPeriodSelector (navegação entre períodos)
- [x] Implementar cálculo de resumo financeiro mensal (calculateMonthlyFinancialSummary)
- [x] Escrever testes para lógica mensal (12 testes passando)
- [x] Validar que histórico anterior é preservado (períodos imutáveis)
- [x] 80 testes passando (12 novos testes de períodos mensais)


## Expansão v15 - Planejamento Financeiro Mensal (CFO Pessoal)

- [ ] Criar schema para Planejamento Financeiro
  - [ ] monthlyBudget: faturamento previsto, meta de lucro
  - [ ] fixedCosts: custos recorrentes (aluguel, internet, energia, etc)
  - [ ] variableCosts: custos previstos (tráfego, combustível, materiais, etc)
  - [ ] personalExpenses: despesas pessoais (cartão, celular, moradia, mercado, dízimo, lazer)
  - [ ] budgetCalculations: cálculos automáticos (lucro líquido, ponto de equilíbrio, meta de segurança)
  
- [ ] Implementar DB helpers para CRUD de planejamento

- [ ] Criar routers tRPC para gerenciar planejamento e cálculos

- [ ] Criar componentes de entrada de dados
  - [ ] FormFixedCosts: cadastro de custos fixos
  - [ ] FormVariableCosts: cadastro de custos variáveis
  - [ ] FormPersonalExpenses: cadastro de despesas pessoais
  - [ ] FormBudgetForecast: entrada de faturamento previsto

- [ ] Criar dashboard com indicadores visuais
  - [ ] Resultado Previsto do Mês (valor líquido)
  - [ ] Status Financeiro (azul/amarelo/vermelho)
  - [ ] Meta de Segurança (quanto ainda pode gastar)
  - [ ] Ponto de Equilíbrio (faturamento mínimo necessário)
  - [ ] Breakdown de despesas (gráfico de pizza)

- [ ] Implementar fluxo de caixa projetado
  - [ ] Gráfico de linha: entrada vs saída ao longo do mês
  - [ ] Projeção de saldo diário

- [ ] Escrever testes para lógica de cálculos

- [ ] Salvar checkpoint com sistema completo


## Expansão v15 - Planejamento Financeiro Mensal (CFO Pessoal)

- [x] Schema: tabelas monthlyBudgets, fixedCosts, variableCosts, personalExpenses, budgetCalculations
- [x] Migração SQL aplicada
- [x] DB helpers: 12 funções para gerenciar planejamento (CRUD completo + cálculos)
- [x] Routers tRPC: budgetPlanning com endpoints para custos, despesas, métricas
- [x] Frontend: componente BudgetPlanningDashboard com indicadores visuais
- [x] Frontend: aba "Planejamento Financeiro" integrada no módulo Financeiro
- [x] Cálculos automáticos: lucro líquido, ponto de equilíbrio, meta de segurança
- [x] Status visual: azul (lucro), amarelo (atenção), vermelho (prejuízo)
- [x] Testes vitest: 95 testes passando (13 novos testes de planejamento)
- [ ] Fluxo de caixa projetado com gráfico de tendência
- [ ] Exportação de relatório PDF com análise completa
- [ ] Análise de cenários (what-if) para diferentes faturamentos


## Expansão v16 - Faturamento Previsto Dinâmico

- [x] Modificar DB helper para calcular faturamento previsto a partir de clientes ativos
- [x] Atualizar router tRPC para buscar faturamento dinâmico
- [x] Modificar BudgetPlanningDashboard para usar faturamento dinâmico
- [x] Implementar atualização automática quando clientes/pagamentos mudam
- [x] Escrever testes para cálculo dinâmico
- [x] Corrigir condição do useEffect (dynamicForecastedRevenue > 0 para >= 0)
- [x] Remover handleUpdateRevenue (faturamento agora é atualizado automaticamente)
- [x] Salvar checkpoint com faturamento dinâmico


## Expansão v17 - Fluxo de Caixa Projetado e Análise de Cenários

- [x] Criar componente ProjectedCashFlow com gráfico de área
- [x] Implementar cálculo de projeção diária de receita/despesa/saldo
- [x] Adicionar indicadores de saldo final, mínimo e máximo
- [x] Criar tabela de projeção diária detalhada
- [x] Criar componente ScenarioAnalysis com simulador What-If
- [x] Implementar sliders para variação de receita e despesas
- [x] Adicionar gráfico de barras para análise de lucro por variação
- [x] Criar tabela de cenários detalhada
- [x] Adicionar análise de ponto de equilíbrio
- [x] Integrar ProjectedCashFlow e ScenarioAnalysis no BudgetPlanningDashboard
- [x] Adicionar abas "Fluxo de Caixa" e "Cenários" nas tabs
- [x] Exportação de Relatório HTML com análise completa (backend + frontend + integração)
- [x] Alertas de Orçamento quando categorias excedem limites
- [x] Google Calendar Integration (OAuth2 + sincronização bidirecional)

## Melhorias Implementadas - v21

- [x] Persistir limites de orçamento por categoria no banco de dados
- [x] Remover valores hardcoded de budgetLimits do budgetAlertsRouter
- [x] Corrigir mapeamento de categorias para usar categorias reais do sistema
- [x] Adicionar endpoints para gerenciar limites de orçamento

## Notas de Melhorias Futuras

As seguintes melhorias foram identificadas como oportunidades para versões futuras:

**Alertas de Orçamento:**
- [x] Adicionar testes Vitest para budgetAlertsRouter
- [x] Adicionar tratamento de erro no componente BudgetAlerts

**Google Calendar Integration:**
- Implementar OAuth2 real do Google Calendar (exchange de authorization code)
- Persistir tokens de acesso e refresh do Google Calendar no banco de dados
- Implementar sincronização real de eventos (criar, atualizar, excluir)
- Adicionar rota de callback OAuth2 no frontend
- Adicionar testes Vitest para googleCalendarRouter
- Implementar tratamento de erro no componente GoogleCalendarSync

**Outras Melhorias:**
- [x] Adicionar filtros por período nas abas financeiras
- [x] Adicionar filtro mensal em Investimentos e Cartão de Crédito
- [x] Corrigir valores de pagamento específicos via edição no detalhe do cliente
- Implementar integração com renda variável
