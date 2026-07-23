import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsToSelect } from "@/components/dashboard/client/reports-to-select";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const options = [
  { id: "o1", name: "Ana" },
  { id: "o2", name: "Bruno" },
];

describe("ReportsToSelect", () => {
  beforeEach(() => { refresh.mockClear(); from.mockClear(); update.mockClear(); eq.mockReset(); eq.mockResolvedValue({ error: null }); });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("restringe as opções às pessoas do mesmo cliente e persiste a escolha", async () => {
    render(<ReportsToSelect contactId="pe1" currentValue={null} options={options} personName="Jane" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Hierarquia de Jane/i })[0]);
    const anaOption = await screen.findByRole("option", { name: "Ana" });
    fireEvent.pointerDown(anaOption);
    fireEvent.click(anaOption);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ reports_to_contact_id: "o1" }));
    expect(eq).toHaveBeenCalledWith("id", "pe1");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("não lista pessoas de outros clientes (apenas as options recebidas via prop)", () => {
    render(<ReportsToSelect contactId="pe1" currentValue={null} options={options} personName="Jane" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Hierarquia de Jane/i })[0]);
    expect(screen.queryByRole("option", { name: "Carla" })).toBeNull();
  });

  it("envia null ao selecionar 'Sem hierarquia' e não revalida em caso de erro", async () => {
    eq.mockResolvedValue({ error: { message: "falhou" } });
    render(<ReportsToSelect contactId="pe1" currentValue="o1" options={options} personName="Jane" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Hierarquia de Jane/i })[0]);
    const noneOption = await screen.findByRole("option", { name: "Sem hierarquia" });
    fireEvent.pointerDown(noneOption);
    fireEvent.click(noneOption);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ reports_to_contact_id: null }));
    expect(refresh).not.toHaveBeenCalled();
  });
});
