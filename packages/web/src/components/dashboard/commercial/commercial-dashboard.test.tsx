import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialDashboard } from "@/components/dashboard/commercial/commercial-dashboard";
import type { CommercialAgendaEntry, CommercialCockpitState } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));
const insert = vi.fn(() => Promise.resolve({ error: null }));
const eq = vi.fn(() => Promise.resolve({ error: null }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ upsert, insert, update }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const state: CommercialCockpitState = {
  id: "s1", owner_user_id: "u1", prospecting_count: 48, meetings_count: 23, nda_poc_count: 12, won_count: 7,
  last_meeting_on: "2026-08-02", last_nda_poc_on: "2026-07-29", last_proposal_on: "2026-07-21", last_won_on: "2026-07-26",
  created_by: "u1", updated_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-04T12:00:00Z",
};
const entry: CommercialAgendaEntry = {
  id: "a1", owner_user_id: "u1", company_name: "Acme", title: "Reunião de descoberta", kind: "meeting",
  scheduled_at: "2026-08-05T13:00:00Z", status: "scheduled", completed_at: null, created_by: "u1", updated_by: "u1",
  created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-04T13:00:00Z",
};

afterEach(cleanup);
beforeEach(() => {
  upsert.mockClear();
  insert.mockClear();
  update.mockClear();
  eq.mockClear();
  from.mockClear();
});

describe("CommercialDashboard", () => {
  it("exibe o cockpit manual simplificado e a agenda gerencial", () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[entry]} users={[{ id: "u1", name: "Marina" }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.getByText("Painel Gerencial")).toBeTruthy();
    expect(screen.getByText("Inclusão rápida.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Editar painel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Modo TV/i }).getAttribute("href")).toBe("/commercial/tv");
    expect(screen.getByText("Prospecção")).toBeTruthy();
    expect(screen.getByText("Reuniões agendadas")).toBeTruthy();
    expect(screen.getByText("NDA / POC")).toBeTruthy();
    expect(screen.getByText("Vendas fechadas")).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByText("Reunião de descoberta")).toBeTruthy();
  });

  it("remove os atalhos que provocariam dupla digitação", () => {
    render(<CommercialDashboard states={[]} agendaEntries={[]} users={[{ id: "u1", name: "Marina" }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("Nova interação")).toBeNull();
    expect(screen.queryByText("Nova oportunidade")).toBeNull();
    expect(screen.queryByText("Gerir funil")).toBeNull();
    expect(screen.getByRole("button", { name: /Adicionar/i })).toBeTruthy();
    expect(screen.getByText("Nenhum compromisso Comercial agendado.")).toBeTruthy();
  });

  it("salva os números e datas do cockpit para o responsável selecionado", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ id: "u1", name: "Marina" }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Prospecção"), { target: { value: "51" } });
    fireEvent.click(dialog.getByRole("button", { name: "Salvar painel" }));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      owner_user_id: "u1",
      prospecting_count: 51,
      meetings_count: 23,
      last_meeting_on: "2026-08-02",
      updated_by: "u1",
    }), { onConflict: "owner_user_id" });
  });

  it("inclui compromisso manual e conclui somente uma data já alcançada", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[entry]} users={[{ id: "u1", name: "Marina" }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Empresa"), { target: { value: "Beta" } });
    fireEvent.change(dialog.getByLabelText("Compromisso"), { target: { value: "Apresentar proposta" } });
    fireEvent.change(dialog.getByLabelText("Tipo"), { target: { value: "proposal" } });
    fireEvent.change(dialog.getByLabelText("Data e hora"), { target: { value: "2026-08-06T14:30" } });
    fireEvent.click(dialog.getByRole("button", { name: "Salvar compromisso" }));

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ company_name: "Beta", title: "Apresentar proposta", kind: "proposal", owner_user_id: "u1" }));

    fireEvent.click(screen.getByRole("button", { name: "Concluir Acme" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ status: "completed", updated_by: "u1" }));
    expect(eq).toHaveBeenCalledWith("id", "a1");
  });
});
