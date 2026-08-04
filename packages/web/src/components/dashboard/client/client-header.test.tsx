import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientHeader } from "@/components/dashboard/client/client-header";
import type { Client } from "@/lib/types/database";

const client: Client = {
  id: "c1",
  name: "Acme",
  segment: "Enterprise",
  logo_url: null,
  contract_value: 120000,
  contract_renewal_date: null,
  owner_manager_id: "m1",
  client_kind: "customer",
  active: true,
  custom_fields: {},
  created_at: "2026-01-01",
};

describe("ClientHeader", () => {
  it("exibe a quantidade de responsáveis por produto na visão 360°", () => {
    render(<ClientHeader client={client} health={undefined} ownerCount={2} unassignedProductCount={0} />);
    expect(screen.getByText((_, element) => element?.textContent === "2 responsáveis por produto")).toBeTruthy();
  });

  it("destaca produtos ainda sem responsável", () => {
    render(<ClientHeader client={client} health={undefined} ownerCount={1} unassignedProductCount={2} />);
    expect(screen.getByText((_, element) => element?.textContent === "1 responsável por produto · 2 produtos sem responsável")).toBeTruthy();
  });
});
