import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientProducts } from "@/components/dashboard/client/client-products";
import type { ClientProduct, ClientProductOwner, DeepManager, Product } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const products: Product[] = [
  { id: "p1", name: "Suite", slug: "suite", color: "#2563eb", active: true, created_at: "2026-01-01" },
  { id: "p2", name: "Portal", slug: "portal", color: "#16a34a", active: true, created_at: "2026-01-01" },
];
const managers: DeepManager[] = [
  { id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" },
  { id: "m2", name: "Carlos", email: null, avatar_color: null, active: true, linked_user_id: "u2", created_at: "2026-01-01" },
];
const assignments: ClientProduct[] = products.map((product, index) => ({
  id: `cp${index + 1}`,
  client_id: "c1",
  product_id: product.id,
  owner_manager_id: index === 0 ? "m1" : "m2",
  contract_value: null,
  renewal_date: null,
  active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}));
const owners: ClientProductOwner[] = assignments.map((assignment, index) => ({
  id: `owner${index + 1}`,
  client_product_id: assignment.id,
  manager_id: index === 0 ? "m1" : "m2",
  active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}));

describe("ClientProducts", () => {
  it("exibe responsáveis distintos e produtos ainda sem histórico", () => {
    render(<ClientProducts assignments={assignments} owners={owners} rows={[]} products={products} managers={managers} canManage={false} />);
    expect(screen.getByText("Marina")).toBeTruthy();
    expect(screen.getByText("Carlos")).toBeTruthy();
    expect(screen.getAllByText("Sem interação registrada")).toHaveLength(2);
  });

  it("exibe vários responsáveis na mesma combinação", () => {
    render(
      <ClientProducts
        assignments={[assignments[0]]}
        owners={[owners[0], { ...owners[1], id: "owner3", client_product_id: assignments[0].id }]}
        rows={[]}
        products={products}
        managers={managers}
        canManage={false}
      />,
    );
    expect(screen.getByText("Marina, Carlos")).toBeTruthy();
  });
});
