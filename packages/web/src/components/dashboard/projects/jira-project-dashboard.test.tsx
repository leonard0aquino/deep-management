import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraProjectDashboard } from "@/components/dashboard/projects/jira-project-dashboard";
import type { JiraIssue, JiraProject } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/projects/actions", () => ({ importJiraCsv: vi.fn() }));
afterEach(cleanup);

const project = { id: "p", project_key: "SIN", name: "Sinergia", active: true, created_at: "2026-08-05", updated_at: "2026-08-05" } as JiraProject;
const issue = { id: "i", project_id: "p", issue_key: "SIN-1", summary: "Card piloto", issue_type: "Tarefa", status: "Concluído", status_category: "Itens concluídos", priority: "High", assignee_name: "Ana", assignee_account_id: "a", source_updated_at: "2026-08-05T12:00:00Z", source_resolved_at: "2026-08-05T11:00:00Z", due_at: null } as JiraIssue;
const projects = { SIN: "Sinergia", SIG: "Sigma", DB: "B.U.s DEEP", HP: "Hiperpag" } as const;

describe("JiraProjectDashboard", () => {
  it("mostra as três visões abertas por responsável e remove a lista de cards", () => {
    render(<JiraProjectDashboard project={project} issues={[issue]} batches={[]} canImport={false} referenceDate="2026-08-05" projects={projects} selectedProjectKey="SIN" />);
    expect(screen.getByText("Sinergia")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Por dia" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Por conclusão" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Todas" })).toBeTruthy();
    expect(screen.getAllByText("Ana").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("Cards do projeto")).toBeNull();
    expect(screen.queryByText("Card piloto")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: /TV de Desenvolvimento/ }).getAttribute("href")).toBe("/projects/tv?project=SIN");
    expect(screen.queryByText("Importar Jira")).toBeNull();
  });

  it("exibe estados vazios próprios nas três visões", () => {
    render(<JiraProjectDashboard project={project} issues={[]} batches={[]} canImport={false} referenceDate="2026-08-05" projects={projects} selectedProjectKey="SIN" />);
    expect(screen.getByText("Nenhuma atualização com data para os filtros atuais.")).toBeTruthy();
    expect(screen.getByText("Nenhuma conclusão com data de resolução para os filtros atuais.")).toBeTruthy();
    expect(screen.getByText("Nenhum responsável para os filtros atuais.")).toBeTruthy();
  });

  it("exibe importação somente para admin", () => {
    render(<JiraProjectDashboard project={project} issues={[]} batches={[]} canImport referenceDate="2026-08-05" projects={projects} selectedProjectKey="SIN" />);
    expect(screen.getByText("Importar Jira")).toBeTruthy();
  });
});
