import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  createAdmin: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({ authenticateApiRequest: mocks.authenticate }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdmin }));

import { GET as getClients } from "@/app/api/v1/clients/route";
import { POST as createInteraction } from "@/app/api/v1/interactions/route";
import { POST as receiveEvent } from "@/app/api/v1/events/route";
import { PUT as updateAction } from "@/app/api/v1/actions/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ ok: true, apiKeyId: "key-1" });
});

describe("API v1 routes", () => {
  it("retorna JSON 401 quando a autenticação falha", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, status: 401, code: "invalid_api_key", message: "Inválida" });
    const response = await getClients(new Request("http://localhost/api/v1/clients"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "invalid_api_key", message: "Inválida" } });
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("valida interação antes de acessar o banco", async () => {
    const response = await createInteraction(new Request("http://localhost/api/v1/interactions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "QBR" }),
    }));
    expect(response.status).toBe(422);
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("cria interação válida e retorna 201", async () => {
    const referenceQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "ok" }, error: null }) };
    const insertQuery = { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "i1", created_at: "now" }, error: null }) }) }) };
    mocks.createAdmin.mockReturnValue({ from: vi.fn((table: string) => table === "interactions" ? insertQuery : referenceQuery) });
    const body = { client_id: "11111111-1111-4111-8111-111111111111", product_id: "22222222-2222-4222-8222-222222222222", interaction_type: "meeting", topic: "QBR", relevance: 5, occurred_at: "2026-07-28" };
    const response = await createInteraction(new Request("http://localhost/api/v1/interactions", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "i1", created_at: "now" } });
  });

  it("rejeita interação futura antes de acessar o banco", async () => {
    const body = { client_id: "11111111-1111-4111-8111-111111111111", product_id: "22222222-2222-4222-8222-222222222222", interaction_type: "meeting", topic: "QBR", relevance: 5, occurred_at: "2999-07-28" };
    const response = await createInteraction(new Request("http://localhost/api/v1/interactions", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: { code: "validation_error", message: "occurred_at não pode estar no futuro." } });
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it("retorna o mesmo evento quando a chave idempotente já existe", async () => {
    const existingQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "e1", received_at: "now" } }) };
    mocks.createAdmin.mockReturnValue({ from: vi.fn(() => existingQuery) });
    const response = await receiveEvent(new Request("http://localhost/api/v1/events", { method: "POST", body: JSON.stringify({ source: "erp", event_type: "contract.updated", external_key: "evt-1", payload: { value: 10 } }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: "e1", received_at: "now", duplicate: true } });
  });

  it("impede alteração da identidade de uma ação", async () => {
    const response = await updateAction(
      new Request("http://localhost/api/v1/actions/11111111-1111-4111-8111-111111111111", { method: "PUT", body: JSON.stringify({ client_id: "outro" }) }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );
    expect(response.status).toBe(422);
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });
});
