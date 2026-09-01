import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialDashboard } from "@/components/dashboard/commercial/commercial-dashboard";
import { prospectingSeriesColor } from "@/components/dashboard/commercial/commercial-prospecting-chart";
import type { CommercialAgendaEntry, CommercialCockpitState, CommercialDailyProspecting, CommercialOpportunity } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const rpc = vi.fn(() => Promise.resolve({ error: null }));
const insert = vi.fn(() => Promise.resolve({ error: null }));
const eq = vi.fn(() => Promise.resolve({ error: null }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ insert, update }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from, rpc }) }));

const state: CommercialCockpitState = {
  id: "s1", owner_user_id: "u1", prospecting_count: 48, meetings_count: 23, nda_poc_count: 12, awaiting_signature_count: 3, won_count: 7,
  last_meeting_on: "2026-08-02", last_nda_poc_on: "2026-07-29", last_proposal_on: "2026-07-21", last_won_on: "2026-07-26",
  created_by: "u1", updated_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-04T12:00:00Z",
};
const entry: CommercialAgendaEntry = {
  id: "a1", owner_user_id: "u1", company_name: "Acme", title: "Reunião de descoberta", kind: "meeting",
  scheduled_at: "2026-08-06T13:00:00Z", status: "scheduled", completed_at: null, created_by: "u1", updated_by: "u1",
  created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-04T13:00:00Z",
};
const dailyEntry: CommercialDailyProspecting = {
  id: "d1", owner_user_id: "u1", activity_on: "2026-08-04", prospecting_count: 6,
  created_by: "u1", updated_by: "u1", created_at: "2026-08-04T12:00:00Z", updated_at: "2026-08-04T12:00:00Z",
};
const user = { id: "u1", name: "Marina", role: "analista" as const, stages: ["prospecting", "meetings", "nda_poc", "awaiting_signature", "won"] as const };
const signatureOpportunity: CommercialOpportunity = {
  id: "op1", client_id: "c1", contact_id: null, product_id: null, owner_manager_id: null, name: "Contrato Aurora",
  stage: "awaiting_signature", amount: 1000, probability: 90, next_step: null, next_step_at: null, closed_at: null,
  loss_reason: null, created_by: "u1", updated_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z",
};

afterEach(cleanup);
beforeEach(() => {
  rpc.mockClear();
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
    expect(screen.getByText("Contratos aguardando assinatura")).toBeTruthy();
    expect(screen.getByText("Vendas fechadas")).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByText("Reunião de descoberta")).toBeTruthy();
    const chart = screen.getByRole("img", { name: /prospecções diárias de Marina/i });
    const summary = document.getElementById(chart.getAttribute("aria-describedby") ?? "");
    expect(summary?.textContent).toContain("Resumo diário das prospecções por analista");
    expect(summary?.textContent).toContain("Marina");
  });

  it("expõe o detalhamento das empresas por hover e foco", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} opportunities={[signatureOpportunity]} clients={[{ id: "c1", name: "Empresa Aurora" }]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    const trigger = screen.getByRole("button", { name: /Contratos aguardando assinatura: 3/i });
    trigger.focus();

    expect(await screen.findByText("Empresa Aurora")).toBeTruthy();
    expect(screen.getByText("4 dias")).toBeTruthy();
    expect(screen.getByText(/2 itens ainda não possuem empresa vinculada/i)).toBeTruthy();
  });

  it("gera cores distintas para mais de seis analistas", () => {
    const colors = Array.from({ length: 8 }, (_, index) => prospectingSeriesColor(index, 8));
    expect(new Set(colors).size).toBe(8);
  });

  it("oculta reunião passada da agenda e preserva o total no funil", () => {
    const pastEntry = { ...entry, id: "past", company_name: "Reunião realizada", scheduled_at: "2026-08-05T14:59:59Z" };
    render(<CommercialDashboard states={[state]} agendaEntries={[pastEntry, entry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("Reunião realizada")).toBeNull();
    expect(screen.getByText("Acme")).toBeTruthy();
    const meetingsStage = screen.getByText("Reuniões agendadas").parentElement;
    expect(meetingsStage && within(meetingsStage).getByText("2")).toBeTruthy();
  });

  it("remove os atalhos que provocariam dupla digitação", () => {
    render(<CommercialDashboard states={[]} agendaEntries={[]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("Nova interação")).toBeNull();
    expect(screen.queryByText("Nova oportunidade")).toBeNull();
    expect(screen.queryByText("Gerir funil")).toBeNull();
    expect(screen.getByRole("button", { name: /Adicionar/i })).toBeTruthy();
    expect(screen.getByText("Nenhum compromisso Comercial agendado.")).toBeTruthy();
    expect(screen.getByText("Prospecções por dia")).toBeTruthy();
    expect(screen.getByRole("img", { name: /prospecções diárias de Marina/i })).toBeTruthy();
  });

  it("recupera o valor diário existente ao trocar a data", () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} dailyProspecting={[dailyEntry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const dialog = within(screen.getByRole("dialog"));

    expect((dialog.getByLabelText("Quantidade") as HTMLInputElement).value).toBe("0");
    fireEvent.change(dialog.getByLabelText("Data"), { target: { value: "2026-08-04" } });
    expect((dialog.getByLabelText("Quantidade") as HTMLInputElement).value).toBe("6");
  });

  it("trava o painel no responsável autenticado e salva sua prospecção diária", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const dialog = within(screen.getByRole("dialog"));
    const responsible = dialog.getByLabelText("Responsável AISphere");
    expect(responsible.getAttribute("readonly")).not.toBeNull();
    expect((responsible as HTMLInputElement).value).toBe("Marina");
    expect(dialog.queryByRole("combobox", { name: "Responsável AISphere" })).toBeNull();
    expect((dialog.getByLabelText("Data") as HTMLInputElement).value).toBe("2026-08-05");
    fireEvent.change(dialog.getByLabelText("Quantidade"), { target: { value: "3" } });
    fireEvent.click(dialog.getByRole("button", { name: "Salvar painel" }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("save_commercial_cockpit", expect.objectContaining({
      p_owner_user_id: "u1",
      p_prospecting_count: 48,
      p_meetings_count: 23,
      p_last_meeting_on: "2026-08-02",
      p_daily_activity_on: "2026-08-05",
      p_daily_prospecting_count: 3,
    }));
  });

  it("inclui compromisso manual e conclui compromisso vencido que não seja reunião", async () => {
    const concludableEntry = { ...entry, id: "proposal-past", company_name: "Beta vencida", kind: "proposal" as const, scheduled_at: "2026-08-05T14:00:00Z" };
    render(<CommercialDashboard states={[state]} agendaEntries={[entry, concludableEntry]} users={[{ ...user, stages: [...user.stages] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);
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

    fireEvent.click(screen.getByRole("button", { name: "Concluir Beta vencida" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ status: "completed", updated_by: "u1" }));
    expect(eq).toHaveBeenCalledWith("id", "proposal-past");
  });

  it("oculta campos e tipos fora das etapas do responsável", () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ id: "u1", name: "Letícia", role: "analista", stages: ["prospecting", "meetings"] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.queryByText("NDA / POC")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const cockpit = within(screen.getByRole("dialog"));
    expect(cockpit.getByText("Prospecções realizadas no dia")).toBeTruthy();
    expect(cockpit.getByLabelText("Quantidade")).toBeTruthy();
    expect(cockpit.queryByLabelText("Reuniões agendadas")).toBeNull();
    expect(cockpit.getByText(/Reuniões agendadas são contabilizadas automaticamente pela agenda/i)).toBeTruthy();
    expect(cockpit.queryByLabelText("NDA / POC")).toBeNull();
    fireEvent.click(cockpit.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
    const agenda = within(screen.getByRole("dialog"));
    const type = agenda.getByLabelText("Tipo");
    expect(within(type).queryByRole("option", { name: "NDA / POC" })).toBeNull();
    expect(within(type).queryByRole("option", { name: "Proposta" })).toBeNull();
    expect(within(type).getByRole("option", { name: "Reunião" })).toBeTruthy();
  });

  it("preserva valores históricos ao salvar prospecção de etapa atribuída", async () => {
    render(<CommercialDashboard states={[state]} agendaEntries={[]} users={[{ id: "u1", name: "Leticia", role: "analista", stages: ["prospecting", "meetings"] }]} currentUserId="u1" referenceAt="2026-08-11T15:00:00Z" />);
    fireEvent.click(screen.getByRole("button", { name: /Editar painel/i }));
    const cockpit = within(screen.getByRole("dialog"));

    fireEvent.change(cockpit.getByLabelText("Quantidade"), { target: { value: "5" } });
    fireEvent.click(cockpit.getByRole("button", { name: "Salvar painel" }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("save_commercial_cockpit", expect.objectContaining({
      p_daily_activity_on: "2026-08-11",
      p_daily_prospecting_count: 5,
      p_nda_poc_count: 12,
      p_awaiting_signature_count: 3,
      p_last_nda_poc_on: "2026-07-29",
      p_last_proposal_on: "2026-07-21",
    }));
  });

  it("mantém compromissos de terceiros somente para consulta", () => {
    const thirdPartyEntry = { ...entry, id: "a2", owner_user_id: "u2", company_name: "Outra empresa" };
    render(<CommercialDashboard states={[state]} agendaEntries={[thirdPartyEntry]} users={[{ ...user, stages: [...user.stages] }, { id: "u2", name: "Carlos", role: "analista", stages: ["meetings"] }]} currentUserId="u1" referenceAt="2026-08-05T15:00:00Z" />);

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
