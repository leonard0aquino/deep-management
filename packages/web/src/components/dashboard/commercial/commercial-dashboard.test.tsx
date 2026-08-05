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
const user = { id: "u1", name: "Marina", stages: ["prospecting", "meetings", "nda_poc", "won"] as const };

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
    render(<CommercialDashboard states={[state]} agendaEntries={[entry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

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
    render(<CommercialDashboard states={[]} agendaEntries={[]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("Nova interação")).toBeNull();
    expect(screen.queryByText("Nova oportunidade")).toBeNull();
    expect(screen.queryByText("Gerir funil")).toBeNull();
    expect(screen.getByRole("button", { name: /Adicionar/i })).toBeTruthy();
    expect(screen.getByText("Nenhum compromisso Comercial agendado.")).toBeTruthy();
  });

  it("trava o painel no responsável autenticado e salva seus números", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const dialog = within(screen.getByRole("dialog"));
    const responsible = dialog.getByLabelText("Responsável AISphere");
    expect(responsible.getAttribute("readonly")).not.toBeNull();
    expect((responsible as HTMLInputElement).value).toBe("Marina");
    expect(dialog.queryByRole("combobox", { name: "Responsável AISphere" })).toBeNull();
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
    render(<CommercialDashboard states={[state]} agendaEntries={[entry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
    const dialog = within(screen.getByRole("dialog"));
    const responsible = dialog.getByLabelText("Responsável AISphere");
    expect(responsible.getAttribute("readonly")).not.toBeNull();
    expect((responsible as HTMLInputElement).value).toBe("Marina");
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

  it("oculta campos e tipos fora das etapas do responsável", () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ id: "u1", name: "Letícia", stages: ["prospecting", "meetings"] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("NDA / POC")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const cockpit = within(screen.getByRole("dialog"));
    expect(cockpit.getByLabelText("Prospecção")).toBeTruthy();
    expect(cockpit.getByLabelText("Reuniões agendadas")).toBeTruthy();
    expect(cockpit.queryByLabelText("NDA / POC")).toBeNull();
    fireEvent.click(cockpit.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
    const agenda = within(screen.getByRole("dialog"));
    const type = agenda.getByLabelText("Tipo");
    expect(within(type).queryByRole("option", { name: "NDA / POC" })).toBeNull();
    expect(within(type).queryByRole("option", { name: "Proposta" })).toBeNull();
    expect(within(type).getByRole("option", { name: "Reunião" })).toBeTruthy();
  });

  it("mantém compromissos de terceiros somente para consulta", () => {
    const thirdPartyEntry = { ...entry, id: "a2", owner_user_id: "u2", company_name: "Outra empresa" };
    render(<CommercialDashboard states={[state]} agendaEntries={[thirdPartyEntry]} users={[{ ...user, stages: [...user.stages] }, { id: "u2", name: "Carlos", stages: ["meetings"] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.getByText("Outra empresa")).toBeTruthy();
    expect(screen.getByText("Carlos")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar Outra empresa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Concluir Outra empresa" })).toBeNull();
  });

  it("preserva a visão e bloqueia escrita para usuário fora da área Comercial", () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[entry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="admin" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Editar painel/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Adicionar/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Editar Acme" })).toBeNull();
  });
});
