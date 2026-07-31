import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AtividadePage from "@/app/(app)/activity/page";

const dashboardData = {
  interactions: [],
  managers: [{ id: "m1", name: "Marina" }],
  clients: [{ id: "c1", name: "Acme" }],
  products: [{ id: "p1", name: "Suite" }],
  contacts: [{ id: "ct1", client_id: "c1", name: "Ana" }],
  clientProducts: [],
};

vi.mock("@/lib/data", () => ({
  getAuthorizedDashboardData: vi.fn(() => Promise.resolve(dashboardData)),
}));

vi.mock("@/lib/auth/access-context", () => ({ requireAccess: vi.fn(() => Promise.resolve()) }));

vi.mock("@/components/dashboard/executive/page-topbar", () => ({
  PageTopbar: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
}));

vi.mock("@/components/dashboard/relationships/relationships-agenda", () => ({
  RelationshipsAgenda: () => <div>Agenda</div>,
}));

vi.mock("@/components/dashboard/registros/interaction-form-dialog", () => ({
  InteractionFormDialog: ({
    open,
    editing,
    clients,
    products,
    managers,
    contacts,
  }: {
    open: boolean;
    editing: unknown;
    clients: unknown[];
    products: unknown[];
    managers: unknown[];
    contacts: unknown[];
  }) =>
    open ? (
      <div role="dialog">
        Nova interação · {editing === null ? "criação" : "edição"} · {clients.length} cliente ·{
          products.length
        } produto · {managers.length} responsável · {contacts.length} contato
      </div>
    ) : null,
}));

describe("AtividadePage", () => {
  it("abre uma nova interação pelo botão do cabeçalho com os dados carregados", async () => {
    render(await AtividadePage());

    fireEvent.click(screen.getByRole("button", { name: "Nova interação" }));

    const dialogText = screen.getByRole("dialog").textContent ?? "";
    expect(dialogText).toContain("Nova interação · criação");
    expect(dialogText).toContain("1 cliente");
    expect(dialogText).toContain("1 produto");
    expect(dialogText).toContain("1 responsável");
    expect(dialogText).toContain("1 contato");
  });
});
