import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientDataQuality } from "@/components/dashboard/client/client-data-quality";
import type { Client } from "@/lib/types/database";

const client = { id: "c1", name: "Acme" } as Client;

describe("ClientDataQuality", () => {
  it("explica a nota e as pendências sem depender de cor", () => {
    render(<ClientDataQuality report={{ client, score: 88, passedChecks: 7, totalChecks: 8, issues: [{ key: "objective", label: "Sem objetivo definido", description: "Registre o objetivo." }] }} />);
    expect(screen.getByRole("heading", { name: "Qualidade dos dados" })).toBeTruthy();
    expect(screen.getByText("88/100 · 7 de 8")).toBeTruthy();
    expect(screen.getByText("Sem objetivo definido")).toBeTruthy();
  });

  it("mostra estado completo", () => {
    render(<ClientDataQuality report={{ client, score: 100, passedChecks: 8, totalChecks: 8, issues: [] }} />);
    expect(screen.getByText(/Todos os dados essenciais/)).toBeTruthy();
  });
});
