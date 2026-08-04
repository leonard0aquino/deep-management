# Roadmap Deep Management

Fonte de verdade aprovada pela AISphere para a evolução da plataforma interna.

## Fase 1 — Adoção e disciplina operacional (0–30 dias)

Objetivo: fazer a equipe usar a plataforma como fonte oficial do relacionamento.

Status: concluída e publicada em produção.

1. Evoluir o registro de interações.
2. Transformar recomendações em tarefas.
3. Criar a visão “Meu dia”.
4. Definir governança de uso.

## Fase 2 — Gestão da carteira e Customer Success (31–60 dias)

Objetivo: sair do acompanhamento de contatos e gerir resultados dos clientes.

Status: concluída e publicada em produção.

1. Plano de sucesso por cliente.
2. Ciclo de vida do cliente.
3. Gestão de renovações.
4. Mapa de pessoas e influência.
5. Cadências e playbooks.

## Fase 3 — Automação e integração (61–90 dias)

Objetivo: reduzir preenchimento manual e aumentar a confiança nos dados.

Status: concluída e publicada em produção no escopo aprovado (itens 3.1 e 3.4).

**Escopo aprovado para execução interna:** itens 3.1 e 3.4. Os itens 3.2 e 3.3 permanecem documentados, mas não serão implementados porque dependem de permissões corporativas de Outlook/Teams que não serão aprovadas pelos critérios de governança da AISphere. Decisão registrada em 28/07/2026.

### 3.1 Importação estruturada

- Importação de clientes por CSV.
- Importação de pessoas.
- Importação de contratos e produtos.
- Importação de histórico de interações.
- Detecção de duplicidades.
- Relatório de erros de importação.

### 3.2 Integração com calendário e e-mail — Não planejada

Priorizar os sistemas usados pela AISphere, especialmente Outlook/Teams. Identificar reuniões com clientes, sugerir o registro posterior, preencher data e participantes, vincular e-mails relevantes, lembrar reuniões sem registro e criar ações a partir de compromissos. Toda captura deve ser assistida e revisada pelo usuário antes de salvar.

Status: não será executada no roadmap atual por dependência de aprovação corporativa indisponível.

### 3.3 Integração com Teams — Não planejada

- Enviar alertas de clientes críticos.
- Publicar resumo semanal da carteira.
- Notificar responsáveis por ações atrasadas.
- Permitir acesso direto à conta ou ação.
- Gerar digest para gestores.

Status: não será executada no roadmap atual por dependência de aprovação corporativa indisponível.

### 3.4 API funcional

- Criar interação.
- Consultar clientes.
- Consultar pessoas.
- Criar ou atualizar ações.
- Consultar Health Score.
- Receber eventos de sistemas internos.

Resultado esperado ajustado: menos trabalho manual por importação e API, mais interações capturadas por sistemas internos autorizados, menor atraso no registro e dados mais confiáveis para o Health Score.

## Fase 4 — Inteligência gerencial (91–120 dias)

Objetivo: permitir que a liderança gerencie execução, risco e resultado.

Status: concluída e publicada em produção em 28/07/2026.

1. Dashboard de gestão.
2. Qualidade dos dados.
3. Relatório executivo periódico.
4. Metas internas.

## Fase 5 — Inteligência assistida por IA (após 120 dias)

Status: planejada, não iniciada. Decisão registrada em 28/07/2026: publicar as Fases 1–4 e manter esta fase fora do escopo de implementação até que os critérios de entrada sejam atendidos e aprovados pela AISphere.

Objetivo: usar IA como apoio à equipe, sem transformá-la no centro do produto e sem substituir a decisão humana.

### Critérios de entrada

- Dados operacionais com qualidade e cobertura suficientes para produzir respostas confiáveis.
- Política aprovada para tratamento de dados de clientes, retenção, auditoria e uso por provedores externos.
- Arquitetura, provedor, modelo, limites de custo e gestão de segredos aprovados.
- Avaliação de qualidade com casos reais e critérios para respostas incorretas ou sem evidência.
- Piloto restrito, com geração sob demanda, revisão humana e fontes rastreáveis antes da liberação ampla.

### Backlog planejado

1. Resumo do histórico do cliente.
2. Preparação para reuniões.
3. Identificação de decisões e compromissos.
4. Sugestão de próximos passos.
5. Resumo semanal por carteira.
6. Detecção de mudança de sentimento.
7. Identificação de riscos escondidos nas notas.
8. Geração de relatório executivo.
9. Busca em linguagem natural sobre clientes, interações e ações.

### Diretrizes de execução futura

- Começar pelo resumo do histórico como piloto controlado para administradores.
- Exibir as fontes utilizadas e permitir revisão antes de qualquer uso operacional.
- Não executar ações, alterar registros ou enviar comunicações automaticamente.
- Não persistir conteúdo gerado até que retenção, privacidade e auditoria estejam definidas.
- Medir precisão, utilidade, custo por geração, tempo economizado e taxa de correções humanas antes de expandir o acesso.

## Fase 6 — Operação Comercial governada

Status: implementada em branch isolada em 04/08/2026; aguardando aplicação das migrações, validação no banco e publicação.

Objetivo: incorporar o time Comercial à fonte única de relacionamento da AISphere, com funil, agenda e visão executiva próprios, sem contaminar a gestão de Customer Success.

### 6.1 Fundação e governança

- Classificar usuários por área de negócio (`customer_success` ou `commercial`) sem alterar a hierarquia Executivo → Gerente → Supervisor → Analista.
- Registrar a área de origem de cada interação como snapshot imutável.
- Separar prospectes de clientes ativos.
- Excluir interações comerciais e prospectes do Health Score de Customer Success.
- Aplicar permissões e trilha de auditoria no banco e na aplicação.

### 6.2 Funil comercial

- Criar oportunidades vinculadas a empresa, produto e responsável.
- Controlar etapa, valor, probabilidade, próximo passo e vencimento.
- Manter histórico auditável das transições de etapa.
- Respeitar a hierarquia e a área de negócio na leitura e na escrita.

### 6.3 Dashboard Comercial

- Criar item próprio na navegação e rota `/commercial`.
- Exibir indicadores de atividade, funil, agenda nativa e alertas de atraso.
- Permitir filtros por período, responsável, etapa, empresa e produto.
- Usar interações e oportunidades como fontes oficiais, sem inferência por texto livre.

### 6.4 Modo TV Comercial

- Criar rota `/commercial/tv` com leitura rápida para acompanhamento coletivo.
- Exibir funil, indicadores de recência e agenda semanal.
- Preservar os temas claro e escuro com ícones de sol e lua.
- Permitir alternância entre TV de Customer Success e TV Comercial apenas a usuários autorizados para ambas.

### Fora do escopo

- Integração com Outlook ou captura automática de e-mail/calendário.
- Alteração da hierarquia de papéis por causa do cargo comercial.
- Uso de interações comerciais no Health Score de Customer Success.
