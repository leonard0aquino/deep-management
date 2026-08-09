import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/(app)/projects/page";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getOne: vi.fn(),
  requireAccess: vi.fn().mockResolvedValue({ role: "admin" }),
}));

vi.mock("@/lib/jira-data", () => ({
  getAllJiraProjectsData: mocks.getAll,
  getJiraProjectData: mocks.getOne,
}));
vi.mock("@/lib/auth/access-context", () => ({ requireAccess: mocks.requireAccess }));
vi.mock("@/services/my-day", () => ({ todayInSaoPaulo: () => "2026-08-09" }));
vi.mock("@/components/dashboard/executive/page-topbar", () => ({ PageTopbar: () => null }));
vi.mock("@/components/dashboard/projects/jira-project-dashboard", () => ({
  JiraProjectDashboard: ({ selectedProjectKey, issues, batches }: { selectedProjectKey: string; issues: unknown[]; batches: unknown[] }) => <div>{selectedProjectKey} · {issues.length} issues · {batches.length} batches</div>,
}));

afterEach(() => {
  cleanup();
  mocks.getAll.mockReset();
  mocks.getOne.mockReset();
});

describe("ProjectsPage", () => {
  it("carrega e agrega todos os projetos quando não há filtro", async () => {
    mocks.getAll.mockResolvedValue([
      { project: { id: "sin" }, issues: [{ id: "1" }], batches: [{ id: "b1", imported_at: "2026-08-08" }] },
      { project: { id: "sig" }, issues: [{ id: "2" }], batches: [{ id: "b2", imported_at: "2026-08-09" }] },
    ]);

    render(await ProjectsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("ALL · 2 issues · 2 batches")).toBeTruthy();
    expect(mocks.getAll).toHaveBeenCalledOnce();
    expect(mocks.getOne).not.toHaveBeenCalled();
  });

  it("carrega somente o projeto selecionado", async () => {
    mocks.getOne.mockResolvedValue({ project: { id: "sig" }, issues: [{ id: "2" }], batches: [] });

    render(await ProjectsPage({ searchParams: Promise.resolve({ project: "SIG" }) }));

    expect(screen.getByText("SIG · 1 issues · 0 batches")).toBeTruthy();
    expect(mocks.getOne).toHaveBeenCalledWith("SIG");
    expect(mocks.getAll).not.toHaveBeenCalled();
  });
});
