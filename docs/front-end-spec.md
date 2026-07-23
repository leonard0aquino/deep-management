# Front-End Spec — Painel de Gestão DEEP (Redesign v3)

## Contexto

Redesign de UI/UX sobre o app existente (`packages/web`, Next.js 16 + Tailwind + shadcn/ui), sem alterar modelo de dados ou features. Escopo: só a camada visual/interação.

## Referência principal

Dashboard “Cockpit Executivo” fornecido pelo usuário em 22/07/2026. A referência define a nova direção de hierarquia, densidade, espaçamento e composição: sidebar clara fixa, topbar compacta, faixa de KPIs e painéis analíticos em grade. O conteúdo de cobrança da imagem não pertence ao domínio do DEEP e não deve ser copiado.

## Inspiração anteriormente avaliada

Referência: dashboard "MoveNow | Sucesso do Cliente" (torre de controle **comercial**). O produto que estamos construindo é de **relacionamento com o cliente** (acompanhamento contínuo, não funil de venda) — domínios diferentes, então nem tudo transfere.

### Aprovado para reuso (padrão visual, agnóstico de domínio)
- Header escuro com pílulas de ação coloridas (cor = significado, não decoração)
- Agrupamento com contador em badge (`Categoria · N`)
- Linhas colapsáveis por grupo
- Cards de métrica compactos (ícone + número + label em linha, não empilhado)

### Rejeitado (específico do domínio comercial)
- Funil de estágios (Em implantação / Em aprovação / Em piloto) — não existe conceito de "fechamento" no nosso modelo
- Calendário de check-in diário (grade de 30 dias) — nosso ritmo de contato é esparso (dias/semanas/meses entre interações), a grade ficaria majoritariamente vazia

## Decisões de design

1. **Shell**: sidebar branca de 204–224px com marca no topo, navegação compacta, item ativo grafite e perfil ancorado no rodapé.
2. **Topbar**: fundo branco, borda inferior sutil, título e data à esquerda; atualização, notificações e ação primária à direita.
3. **Cards de métrica**: uma faixa de 5–7 cards compactos, com label, número, ícone em superfície neutra e tendência/contexto na base.
4. **Conteúdo analítico**: grade de duas colunas no desktop, uma coluna em telas menores, com painéis brancos, bordas suaves e raio de 12px.
5. **Tipografia e densidade**: escala mais contida, títulos entre 13–16px, textos auxiliares entre 11–13px e espaçamento uniforme de 16–24px.
6. **Cores**: base neutra; azul para ação/ênfase, verde para saúde positiva, âmbar para atenção e vermelho apenas para risco/erro.
7. **Mapa de Calor e registros**: mantêm estrutura e interações atuais, herdando os novos tokens e a densidade visual.

## Fora de escopo (não implementar)
- Calendário diário / grade de dias do mês
- Conceito de estágio de funil/oportunidade
- Mudança de schema ou features novas

## Owner
Uma (UX Design Expert) — spec, @dev — implementação
