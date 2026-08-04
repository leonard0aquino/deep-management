import { describe, expect, it } from "vitest";
import { hierarchyUserIds, leaderCandidates } from "@/lib/auth/user-hierarchy";
import type { UserProfile } from "@/lib/types/database";

const profile = (id: string, role: UserProfile["role"], managerUserId: string | null = null): UserProfile => ({
  id,
  name: id,
  role,
  business_area: "customer_success",
  manager_user_id: managerUserId,
  created_at: "2026-07-31",
});

const profiles = [
  profile("exec", "executivo"),
  profile("ger", "gerente", "exec"),
  profile("sup", "supervisor", "ger"),
  profile("ana", "analista", "sup"),
  profile("ana2", "analista", "other-sup"),
];

describe("hierarquia de usuários", () => {
  it("resolve toda a estrutura transitiva do Gerente", () => {
    expect([...hierarchyUserIds("ger", profiles)]).toEqual(["ger", "sup", "ana"]);
  });

  it("limita Supervisor aos seus Analistas e Analista a si mesmo", () => {
    expect([...hierarchyUserIds("sup", profiles)]).toEqual(["sup", "ana"]);
    expect([...hierarchyUserIds("ana", profiles)]).toEqual(["ana"]);
  });

  it("oferece somente líderes compatíveis com o papel", () => {
    expect(leaderCandidates(profiles[1], profiles).map((item) => item.id)).toEqual(["exec"]);
    expect(leaderCandidates(profiles[2], profiles).map((item) => item.id)).toEqual(["ger"]);
    expect(leaderCandidates(profiles[3], profiles).map((item) => item.id)).toEqual(["ger", "sup"]);
    expect(leaderCandidates(profiles[0], profiles)).toEqual([]);
  });
});
