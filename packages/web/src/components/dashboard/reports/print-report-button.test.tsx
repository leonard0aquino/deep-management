import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintReportButton } from "@/components/dashboard/reports/print-report-button";

describe("PrintReportButton", () => {
  it("aciona a impressão nativa do navegador", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintReportButton />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / salvar PDF" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
