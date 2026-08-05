import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraProjectDashboard } from "@/components/dashboard/projects/jira-project-dashboard";
import type { JiraIssue, JiraProject } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/projects/actions", () => ({ importJiraCsv: vi.fn() }));
afterEach(cleanup);

const project = { id: "p", project_key: "SIN", name: "Sinergia", active: true, created_at: "2026-08-05", updated_at: "2026-08-05" } as JiraProject;
const issue = { id: "i", project_id: "p", issue_key: "SIN-1", summary: "Card piloto", issue_type: "Tarefa", status: "Em andamento", status_category: "Em andamento", priority: "High", assignee_name: "Ana", assignee_account_id: "a", source_updated_at: "2026-08-05T12:00:00Z", due_at: null } as JiraIssue;
const projects = { SIN: "Sinergia", SIG: "Sigma", DB: "B.U.s DEEP", HP: "Hiperpag" } as const;

describe("JiraProjectDashboard", () => {
  it("mostra indicadores, governança de volume e acesso à TV", () => {
    render(<JiraProjectDashboard project={project} issues={[issue]} batches={[]} canImport={false} referenceDate="2026-08-05" projects={projects} selectedProjectKey="SIN" />);
    expect(screen.getByText("Sinergia")).toBeTruthy();
    expect(screen.getByText("Card piloto")).toBeTruthy();
    expect(screen.getByText("Volume atual de cards por pessoa; não representa produtividade.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /TV de Desenvolvimento/ }).getAttribute("href")).toBe("/projects/tv?project=SIN");
    expect(screen.queryByText("Importar Jira")).toBeNull();
  });

  it("exibe importação somente para admin", () => {
    render(<JiraProjectDashboard project={project} issues={[]} batches={[]} canImport referenceDate="2026-08-05" projects={projects} selectedProjectKey="SIN" />);
    expect(screen.getByText("Importar Jira")).toBeTruthy();
  });
});
