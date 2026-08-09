import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));

import GoalsPage from "@/app/(app)/goals/page";
import ExecutiveReportPage from "@/app/(app)/reports/executive/page";

describe("telas executivas desativadas", () => {
  beforeEach(() => notFound.mockClear());

  it("indisponibiliza Metas para todos antes de carregar a tela", () => {
    GoalsPage();
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("indisponibiliza o Relatório Executivo para todos antes de carregar a tela", () => {
    ExecutiveReportPage();
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
