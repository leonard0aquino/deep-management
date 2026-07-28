import { describe, expect, it } from "vitest";
import { apiKeyRecordIsUsable, extractBearerToken, hashApiKey } from "@/lib/api/auth";

describe("API authentication", () => {
  it("aceita somente o formato de chave emitido pela plataforma", () => {
    const key = `deep_${"a".repeat(48)}`;
    expect(extractBearerToken(`Bearer ${key}`)).toBe(key);
    expect(extractBearerToken("Bearer qualquer-chave")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("gera hash SHA-256 determinístico sem preservar a chave", () => {
    const key = `deep_${"b".repeat(48)}`;
    expect(hashApiKey(key)).toHaveLength(64);
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toContain(key);
  });

  it("rejeita chave ausente ou revogada", () => {
    expect(apiKeyRecordIsUsable(null)).toBe(false);
    expect(apiKeyRecordIsUsable({ id: "k1", revoked: true })).toBe(false);
    expect(apiKeyRecordIsUsable({ id: "k1", revoked: false })).toBe(true);
  });
});
