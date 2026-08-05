import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/app-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/my-day" }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));

afterEach(cleanup);

describe("AppSidebar", () => {
  it("mostra somente áreas operacionais e da carteira para analista", () => {
    render(<AppSidebar userEmail="ana@aisphere.com" userName="Ana Silva" userRole="analista" userBusinessArea="customer_success" />);

    const links = screen.getAllByRole("link");
    expect(links[0].textContent).toContain("Meu dia");
    expect(links[0].getAttribute("href")).toBe("/my-day");
    expect(links[0].getAttribute("class")).toContain("bg-slate-950");
    expect(screen.queryByRole("link", { name: "Cockpit Executivo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Gestão" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relatório" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Metas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Modo TV" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Configurações" })).toBeNull();
    expect(screen.getByRole("link", { name: "Carteira" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Projetos" })).toBeNull();
  });

  it("oculta visões estratégicas e configurações para gerente", () => {
    render(<AppSidebar userEmail="gerente@aisphere.com" userName="Gerente" userRole="gerente" userBusinessArea="customer_success" />);

    expect(screen.queryByRole("link", { name: "Gestão" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relatório" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Metas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Cockpit Executivo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Configurações" })).toBeNull();
    expect(screen.getByRole("link", { name: "Projetos" })).toBeTruthy();
  });

  it("mostra as áreas operacionais para Supervisor", () => {
    render(<AppSidebar userEmail="supervisor@aisphere.com" userName="Supervisor" userRole="supervisor" userBusinessArea="customer_success" />);

    expect(screen.getByRole("link", { name: "Meu dia" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Atividade" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Carteira" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Cockpit Executivo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Configurações" })).toBeNull();
    expect(screen.getByRole("link", { name: "Projetos" })).toBeTruthy();
  });

  it("mantém todas as visões disponíveis para admin", () => {
    render(<AppSidebar userEmail="admin@aisphere.com" userName="Admin" userRole="admin" userBusinessArea="customer_success" />);

    expect(screen.getByRole("link", { name: "Gestão" }).getAttribute("href")).toBe("/analytics");
    expect(screen.getByRole("link", { name: "Relatório" }).getAttribute("href")).toBe("/reports/executive");
    expect(screen.getByRole("link", { name: "Metas" }).getAttribute("href")).toBe("/goals");
    expect(screen.getByRole("link", { name: "Configurações" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Comercial" }).getAttribute("href")).toBe("/commercial");
    expect(screen.getByRole("link", { name: "Projetos" }).getAttribute("href")).toBe("/projects");
  });

  it("mostra visão estratégica, Produtos e Configurações para executivo", () => {
    render(<AppSidebar userEmail="executivo@aisphere.com" userName="Executivo" userRole="executivo" userBusinessArea="customer_success" />);

    expect(screen.getByRole("link", { name: "Cockpit Executivo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gestão" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Carteira" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Modo TV" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Meu dia" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Atividade" })).toBeNull();
    expect(screen.getByRole("link", { name: "Produtos" }).getAttribute("href")).toBe("/products");
    expect(screen.queryByRole("link", { name: "Pessoas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Configurações" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Comercial" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Projetos" })).toBeTruthy();
  });

  it("mostra Comercial ao analista da área sem promover acesso estratégico", () => {
    render(<AppSidebar userEmail="vendas@aisphere.com" userName="Vendas" userRole="analista" userBusinessArea="commercial" />);
    expect(screen.getByRole("link", { name: "Comercial" }).getAttribute("href")).toBe("/commercial");
    expect(screen.queryByRole("link", { name: "Cockpit Executivo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Gestão" })).toBeNull();
  });
});
