import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsSettings } from "@/components/dashboard/settings/products-settings";
import type { Product } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const eq = vi.fn();
const remove = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ delete: remove }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const product: Product = {
  id: "p1", name: "Suite", slug: "suite", color: null, active: true, created_at: "2026-01-01",
};

describe("ProductsSettings", () => {
  beforeEach(() => { from.mockClear(); remove.mockClear(); eq.mockReset(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("exige confirmação antes de excluir um produto", async () => {
    eq.mockResolvedValue({ error: null });
    render(<ProductsSettings products={[product]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Suite" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(eq).toHaveBeenCalledWith("id", "p1");
  });

  it("exibe erro quando a exclusão falha", async () => {
    eq.mockResolvedValue({ error: { message: "produto em uso" } });
    render(<ProductsSettings products={[product]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Suite" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/produto em uso/));
  });
});
