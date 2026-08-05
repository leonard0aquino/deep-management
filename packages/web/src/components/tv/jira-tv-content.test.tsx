import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JiraTvContent } from "@/components/tv/jira-tv-content";
import type { JiraIssue } from "@/lib/types/database";

afterEach(cleanup);

describe("JiraTvContent", () => {
  it("mostra execução e exceções usando os mesmos cards do painel", () => {
    const issue = { id: "1", issue_key: "SIN-10", summary: "Corrigir integração", status: "Em andamento", status_category: "Em andamento", assignee_name: null, assignee_account_id: null, due_at: "2026-08-04", source_updated_at: "2026-08-05T12:00:00Z" } as JiraIssue;
    render(<JiraTvContent issues={[issue]} lastImportedAt="2026-08-05T12:00:00Z" referenceDate="2026-08-05" />);
    expect(screen.queryByText("TV de Desenvolvimento", { exact: false })).toBeNull();
    expect(screen.getByText(/SIN-10/)).toBeTruthy();
    expect(screen.getAllByText("Sem responsável").length).toBeGreaterThan(0);
    expect(screen.getByText("1 vencido(s)")).toBeTruthy();
  });

  it("aplica o período também aos indicadores e ao fluxo por status", () => {
    const issues = [
      { id: "1", issue_key: "SIN-1", summary: "Recente", status: "Em andamento", status_category: "Em andamento", source_updated_at: "2026-08-05T12:00:00Z" },
      { id: "2", issue_key: "SIG-1", summary: "Antigo", status: "Concluído", status_category: "Itens concluídos", source_updated_at: "2026-07-01T12:00:00Z" },
    ] as JiraIssue[];
    render(<JiraTvContent issues={issues} lastImportedAt={null} referenceDate="2026-08-05" period="7" />);
    expect(screen.getByText(/SIN-1/)).toBeTruthy();
    expect(screen.queryByText("Concluído")).toBeNull();
    expect(screen.queryByText(/SIG-1/)).toBeNull();
  });
});
