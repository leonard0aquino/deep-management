import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StructuredImportSettings } from "@/components/dashboard/settings/structured-import-settings";

vi.mock("@/app/(app)/admin/import-actions", () => ({
  executeStructuredImport: vi.fn(),
}));

afterEach(cleanup);

describe("StructuredImportSettings", () => {
  it("mostra o modelo da modalidade selecionada", () => {
    render(<StructuredImportSettings references={{}} />);
    expect(screen.getByText("name,segment,contract_value,contract_renewal_date,owner_email")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pessoas" }));
    expect(screen.getByText("client_name,name,role,email,phone,influence")).toBeTruthy();
  });

  it("analisa o arquivo antes de habilitar a confirmação", async () => {
    render(<StructuredImportSettings references={{ clients: [] }} />);
    const file = new File(["name,segment\nAcme,Enterprise"], "clientes.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue("name,segment\nAcme,Enterprise") });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("1 válidas")).toBeTruthy());
    expect((screen.getByRole("button", { name: "Confirmar 1 registro(s)" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
