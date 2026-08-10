import { describe, expect, it } from "vitest";
import { analyzeJiraCsv, buildJiraDailyStackedChart, buildJiraProjectDashboard, normalizeJiraProjectSelection } from "@/services/jira-import";
import type { JiraIssue } from "@/lib/types/database";

const csv = `Tipo de item,Chave da item,ID da item,Resumo,Responsável,ID do responsável,Prioridade,Status,Resolução,Criado,Atualizado(a),Data limite
Tarefa,SIN-1,100,Primeiro card,Ana,acc-1,High,Concluído,Concluído,17/mar/26 10:00 AM,05/ago/26 10:33 AM,03/ago/26
Erro,SIN-2,101,"Erro, com vírgula",,,Highest,Em andamento,,18/mar/26 02:00 PM,04/ago/26 09:00 AM,04/ago/26`;

describe("importação Jira", () => {
  it("abre a visão geral por padrão e normaliza projetos suportados", () => {
    expect(normalizeJiraProjectSelection()).toBe("ALL");
    expect(normalizeJiraProjectSelection("all")).toBe("ALL");
    expect(normalizeJiraProjectSelection("sig")).toBe("SIG");
    expect(normalizeJiraProjectSelection("desconhecido")).toBe("ALL");
  });

  it("aceita o modelo enxuto e infere projeto e categoria", () => {
    const result = analyzeJiraCsv(csv);
    expect(result.issues).toEqual([]);
    expect(result.projectKey).toBe("SIN");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].status_category).toBe("Itens concluídos");
    expect(result.rows[0].source_updated_at).toBe("2026-08-05T13:33:00.000Z");
    expect(result.rows[1].summary).toBe("Erro, com vírgula");
    expect(result.rows[1].due_at).toBe("2026-08-04");
  });

  it("rejeita projeto divergente e chave duplicada", () => {
    const invalid = csv.replace("SIN-2", "SIN-1").replace("Erro,SIN-1", "Erro,OUT-1");
    const result = analyzeJiraCsv(invalid);
    expect(result.issues.some((issue) => issue.message.includes("projeto SIN"))).toBe(true);
  });

  it("aceita os projetos governados sem fixar o piloto Sinergia", () => {
    const sigma = analyzeJiraCsv(csv.replaceAll("SIN-", "SIG-"));
    expect(sigma.projectKey).toBe("SIG");
    expect(sigma.issues).toEqual([]);
  });

  it("rejeita datas impossíveis nos formatos ISO e Jira", () => {
    const invalidIso = csv.replace("03/ago/26", "2026-02-31");
    expect(analyzeJiraCsv(invalidIso).issues.some((issue) => issue.field === "data limite")).toBe(true);
    const invalidJira = csv.replace("17/mar/26 10:00 AM", "31/fev/26 10:00 AM");
    expect(analyzeJiraCsv(invalidJira).issues.some((issue) => issue.field === "criado")).toBe(true);
    const invalidMeridiem = csv.replace("17/mar/26 10:00 AM", "17/mar/26 13:00 PM");
    expect(analyzeJiraCsv(invalidMeridiem).issues.some((issue) => issue.field === "criado")).toBe(true);
  });

  it("calcula indicadores e filtros sem chamar volume de produtividade", () => {
    const issues = [
      { id: "1", status_category: "Itens concluídos", assignee_account_id: "a", assignee_name: "Ana", source_updated_at: "2026-08-05T12:00:00Z", source_resolved_at: "2026-08-05T11:00:00Z", due_at: null },
      { id: "2", status_category: "Em andamento", assignee_account_id: null, assignee_name: null, source_updated_at: "2026-08-04T12:00:00Z", source_resolved_at: null, due_at: "2026-08-03" },
      { id: "3", status_category: "Em andamento", assignee_account_id: "a", assignee_name: "Ana", source_updated_at: "2026-07-01T12:00:00Z", due_at: null },
      { id: "4", status_category: "Em andamento", assignee_account_id: null, assignee_name: "Bruno", source_updated_at: "2026-08-05T13:00:00Z", due_at: null },
    ] as JiraIssue[];
    const all = buildJiraProjectDashboard(issues, "2026-08-05");
    expect(all.kpis).toEqual({ total: 4, completed: 1, open: 3, overdue: 1, unassigned: 1 });
    expect(buildJiraProjectDashboard(issues, "2026-08-05", { period: "7" }).kpis.total).toBe(3);
    expect(buildJiraProjectDashboard(issues, "2026-08-05", { period: "today" }).issues.map((issue) => issue.id)).toEqual(["1", "4"]);
    expect(buildJiraProjectDashboard(issues, "2026-08-05", { assignee: "__unassigned__" }).issues).toHaveLength(1);
    expect(buildJiraProjectDashboard(issues, "2026-08-05", { assignee: "name:bruno" }).issues.map((issue) => issue.id)).toEqual(["4"]);
  });

  it("ordena responsáveis por cards abertos e informa o aberto mais antigo", () => {
    const issues = [
      { id: "1", status_category: "Em andamento", assignee_account_id: "a", assignee_name: "Ana", source_created_at: "2026-08-03T12:00:00Z" },
      { id: "2", status_category: "Itens concluídos", assignee_account_id: "a", assignee_name: "Ana", source_created_at: "2026-07-01T12:00:00Z" },
      { id: "3", status_category: "Em andamento", assignee_account_id: "b", assignee_name: "Bruno", source_created_at: "2026-08-02T12:00:00Z" },
      { id: "4", status_category: "Em andamento", assignee_account_id: "b", assignee_name: "Bruno", source_created_at: "2026-07-30T12:00:00Z" },
      { id: "5", status_category: "Itens concluídos", assignee_account_id: "c", assignee_name: "Caio", source_created_at: "2026-06-01T12:00:00Z" },
    ] as JiraIssue[];

    const dashboard = buildJiraProjectDashboard(issues, "2026-08-05");
    expect(dashboard.assignees.map((item) => item.name)).toEqual(["Bruno", "Ana", "Caio"]);
    expect(dashboard.assignees.map((item) => item.oldestOpenCreatedAt)).toEqual([
      "2026-07-30T12:00:00Z",
      "2026-08-03T12:00:00Z",
      null,
    ]);
  });

  it("abre visões por dia e por conclusão usando as datas reais do Jira", () => {
    const issues = [
      { id: "1", status_category: "Itens concluídos", assignee_account_id: "a", assignee_name: "Ana", source_updated_at: "2026-08-06T02:30:00Z", source_resolved_at: "2026-08-05T22:00:00Z" },
      { id: "2", status_category: "Itens concluídos", assignee_account_id: "a", assignee_name: "Ana", source_updated_at: "2026-08-05T15:00:00Z", source_resolved_at: "2026-08-05T20:00:00Z" },
      { id: "3", status_category: "Itens concluídos", assignee_account_id: "b", assignee_name: "Bruno", source_updated_at: "2026-08-04T15:00:00Z", source_resolved_at: null },
      { id: "4", status_category: "Em andamento", assignee_account_id: null, assignee_name: null, source_updated_at: null, source_resolved_at: null },
    ] as JiraIssue[];

    const dashboard = buildJiraProjectDashboard(issues, "2026-08-05");
    expect(dashboard.activityByDay).toEqual([
      { date: "2026-08-05", total: 2, assignees: [{ id: "a", name: "Ana", total: 2 }] },
      { date: "2026-08-04", total: 1, assignees: [{ id: "b", name: "Bruno", total: 1 }] },
    ]);
    expect(dashboard.completionsByAssignee).toEqual([
      { id: "a", name: "Ana", completed: 2, latestResolvedAt: "2026-08-05T22:00:00Z", share: 100 },
    ]);
    expect(dashboard.completedWithoutResolvedDate).toBe(1);
    expect(dashboard.assignees.map((item) => item.name)).toEqual(["Sem responsável", "Ana", "Bruno"]);
  });

  it("aplica os filtros existentes às três visões", () => {
    const issues = [
      { id: "1", status_category: "Itens concluídos", status: "Concluído", priority: "High", issue_type: "Tarefa", assignee_account_id: "a", assignee_name: "Ana", source_updated_at: "2026-08-05T12:00:00Z", source_resolved_at: "2026-08-05T11:00:00Z" },
      { id: "2", status_category: "Itens concluídos", status: "Concluído", priority: "Low", issue_type: "Tarefa", assignee_account_id: "b", assignee_name: "Bruno", source_updated_at: "2026-08-05T12:00:00Z", source_resolved_at: "2026-08-05T10:00:00Z" },
    ] as JiraIssue[];

    const dashboard = buildJiraProjectDashboard(issues, "2026-08-05", { priority: "High", status: "Concluído" });
    expect(dashboard.activityByDay[0]?.assignees.map((item) => item.name)).toEqual(["Ana"]);
    expect(dashboard.completionsByAssignee.map((item) => item.name)).toEqual(["Ana"]);
    expect(dashboard.assignees.map((item) => item.name)).toEqual(["Ana"]);
  });

  it("mantém a mesma identidade legível nas três visões quando o Jira omite o nome", () => {
    const issues = [{
      id: "1",
      status_category: "Itens concluídos",
      assignee_account_id: "account-1",
      assignee_name: "   ",
      source_updated_at: "2026-08-05T12:00:00Z",
      source_resolved_at: "2026-08-05T11:00:00Z",
    }] as JiraIssue[];

    const dashboard = buildJiraProjectDashboard(issues, "2026-08-05");
    expect(dashboard.assignees[0]?.name).toBe("Responsável sem nome");
    expect(dashboard.activityByDay[0]?.assignees[0]?.name).toBe("Responsável sem nome");
    expect(dashboard.completionsByAssignee[0]?.name).toBe("Responsável sem nome");
  });

  it("consolida o gráfico diário em ordem cronológica e agrupa os menores volumes", () => {
    const chart = buildJiraDailyStackedChart([
      {
        date: "2026-08-06",
        total: 18,
        assignees: [
          { id: "a", name: "Ana", total: 6 },
          { id: "b", name: "Bruno", total: 5 },
          { id: "c", name: "Caio", total: 2 },
          { id: "d", name: "Dora", total: 2 },
          { id: "e", name: "Eva", total: 1 },
          { id: "f", name: "Fábio", total: 1 },
          { id: "g", name: "Gabi", total: 1 },
        ],
      },
      {
        date: "2026-08-05",
        total: 10,
        assignees: [
          { id: "a", name: "Ana", total: 3 },
          { id: "b", name: "Bruno", total: 2 },
          { id: "c", name: "Caio", total: 2 },
          { id: "d", name: "Dora", total: 1 },
          { id: "e", name: "Eva", total: 1 },
          { id: "h", name: "Hugo", total: 1 },
        ],
      },
    ]);

    expect(chart.series.map((item) => item.name)).toEqual(["Ana", "Bruno", "Caio", "Dora", "Eva", "Fábio", "Outros"]);
    expect(chart.days.map((item) => item.date)).toEqual(["2026-08-05", "2026-08-06"]);
    expect(chart.days[0]).toMatchObject({ total: 10, counts: { a: 3, b: 2, c: 2, d: 1, e: 1, f: 0, __others__: 1 } });
    expect(chart.days[1]).toMatchObject({ total: 18, counts: { a: 6, b: 5, c: 2, d: 2, e: 1, f: 1, __others__: 1 } });
    expect(chart.days.map((day) => Object.values(day.counts).reduce((sum, value) => sum + value, 0))).toEqual([10, 18]);
  });
});
