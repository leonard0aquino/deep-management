import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("prioridade da Timeline nas visões de detalhe", () => {
  it("posiciona a Timeline do cliente logo após o cabeçalho", () => {
    const page = source("src/app/(app)/accounts/[id]/page.tsx");
    const header = page.indexOf("<ClientHeader");
    const timeline = page.indexOf("<Timeline interactions={clientInteractions}");
    const nextSection = page.indexOf("<ClientDataQuality");

    expect(header).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(header);
    expect(timeline).toBeLessThan(nextSection);
  });

  it("posiciona a Timeline filtrada do produto logo após o cabeçalho", () => {
    const page = source("src/app/(app)/products/[id]/page.tsx");
    const header = page.indexOf("<ProductHeader");
    const timeline = page.indexOf("<Timeline interactions={productInteractions}");
    const nextSection = page.indexOf("<ProductRevenue");

    expect(header).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(header);
    expect(timeline).toBeLessThan(nextSection);
  });
});
