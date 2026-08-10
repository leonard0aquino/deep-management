import { describe, expect, it } from "vitest";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";

describe("catálogo de tipos de interação", () => {
  it("disponibiliza Contato no Teams nas listas baseadas no catálogo", () => {
    expect(INTERACTION_TYPE_CONFIG.teams.label).toBe("Contato no Teams");
    expect(Object.keys(INTERACTION_TYPE_CONFIG)).toContain("teams");
  });
});
