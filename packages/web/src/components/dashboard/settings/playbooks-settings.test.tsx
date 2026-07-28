import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybooksSettings } from "@/components/dashboard/settings/playbooks-settings";
import type { CustomerPlaybook, CustomerPlaybookStep } from "@/lib/types/database";

const refresh = vi.fn();
const single = vi.fn();
const select = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select }));
const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const remove = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ insert, update, delete: remove }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

const playbook: CustomerPlaybook = { id: "pb1", name: "Onboarding", description: "Entrada", active: true, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };
const step: CustomerPlaybookStep = { id: "s1", playbook_id: "pb1", position: 1, title: "Kickoff", guidance: null, day_offset: 0, priority: "media", recommended_interaction_type: "meeting", created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };

describe("PlaybooksSettings", () => {
  beforeEach(() => { single.mockReset(); insert.mockClear(); update.mockClear(); remove.mockClear(); eq.mockReset(); refresh.mockClear(); });
  afterEach(cleanup);

  it("exibe a biblioteca sem controles de escrita para analista", () => {
    render(<PlaybooksSettings initialPlaybooks={[playbook]} initialSteps={[step]} readOnly />);
    expect(screen.getByText("Onboarding")).toBeTruthy();
    expect(screen.getByText(/Dia \+0/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Criar playbook/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Adicionar etapa/i })).toBeNull();
  });

  it("cria playbook e apresenta confirmação somente após o banco", async () => {
    single.mockResolvedValue({ data: { ...playbook, id: "pb2", name: "Renovação" }, error: null });
    render(<PlaybooksSettings initialPlaybooks={[]} initialSteps={[]} />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Renovação" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Preparar renovação" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar playbook" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ name: "Renovação", description: "Preparar renovação" }));
    expect((await screen.findByRole("status")).textContent).toContain("Playbook “Renovação” criado");
  });

  it("adiciona etapa ordenada com prazo relativo, prioridade e canal", async () => {
    single.mockResolvedValue({ data: { ...step, id: "s2", position: 2, title: "Revisão", day_offset: 30, priority: "alta", recommended_interaction_type: "call" }, error: null });
    render(<PlaybooksSettings initialPlaybooks={[playbook]} initialSteps={[step]} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar etapa" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Revisão" } });
    fireEvent.change(screen.getByLabelText("Dias após início"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Prioridade"), { target: { value: "alta" } });
    fireEvent.change(screen.getByLabelText("Interação"), { target: { value: "call" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar etapa" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ playbook_id: "pb1", position: 2, title: "Revisão", day_offset: 30, priority: "alta", recommended_interaction_type: "call" })));
  });
});
