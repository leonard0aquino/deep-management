import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientStakeholders } from "@/components/dashboard/client/client-stakeholders";
import type { ClientContact, DeepManager, StakeholderHealth } from "@/lib/types/database";

vi.mock("@/components/dashboard/client/stakeholder-avatar", () => ({ StakeholderAvatar: ({ name }: { name: string }) => <span>{name.slice(0, 1)}</span> }));
vi.mock("@/components/dashboard/client/reports-to-select", () => ({ ReportsToSelect: () => <button>Editar hierarquia</button> }));
vi.mock("@/components/management/entity-edit-dialog", () => ({ EntityEditDialog: () => <button>Editar pessoa</button> }));

const stakeholder: StakeholderHealth = {
  contact_id: "p1", client_id: "c1", client_name: "Acme", name: "Joana", role: "Diretora", email: null, phone: null,
  influence: "alta", relationship_role: "patrocinador", owner_manager_id: "m1", owner_manager_name: "Marina",
  photo_url: null, reports_to_contact_id: null, last_contact: "2026-06-01", interaction_count: 3,
  last_customer_sentiment: "negative", sentiment_recorded_at: "2026-07-01", days_since_contact: 57,
  status: "alerta", score: 30, risk: "alto",
};
const contact: ClientContact = {
  id: "p1", client_id: "c1", name: "Joana", role: "Diretora", email: null, phone: null, influence: "alta",
  relationship_role: "patrocinador", owner_manager_id: "m1", photo_url: null, reports_to_contact_id: null, created_at: "2026-01-01",
};
const managers: DeepManager[] = [{ id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" }];

describe("ClientStakeholders", () => {
  afterEach(cleanup);

  it("mostra cobertura, concentração e patrocinador esfriando por texto", () => {
    render(<ClientStakeholders stakeholders={[stakeholder]} contacts={[contact]} managers={managers} canManage={false} />);
    expect(screen.getAllByText("Patrocinador")).toHaveLength(2);
    expect(screen.getAllByText("Coberto")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toContain("Relacionamento concentrado");
    expect(screen.getByRole("alert").textContent).toContain("Decisor não mapeado");
    expect(screen.getByRole("alert").textContent).toContain("Patrocinador Joana exige atenção");
    expect(screen.getByText("Sentimento negativo")).toBeTruthy();
  });

  it("remove controles de escrita para analistas", () => {
    render(<ClientStakeholders stakeholders={[stakeholder]} contacts={[contact]} managers={managers} canManage={false} />);
    expect(screen.queryByRole("button", { name: "Editar pessoa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar hierarquia" })).toBeNull();
  });

  it("oferece edição e hierarquia para gerente ou admin", () => {
    render(<ClientStakeholders stakeholders={[stakeholder]} contacts={[contact]} managers={managers} canManage />);
    expect(screen.getByRole("button", { name: "Editar pessoa" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar hierarquia" })).toBeTruthy();
  });
});
