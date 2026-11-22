import type { Role } from "@/types/domain";

/** Which roles may open each area. These drive navigation and route guards (UX only: RLS is the real control). */
export const ACCESS = {
  staffHome: ["admin", "librarian", "teacher"],
  circulation: ["admin", "librarian"],
  admin: ["admin", "librarian"],
} as const satisfies Record<string, readonly Role[]>;

export function can(role: Role | null, allowed: readonly Role[]): boolean {
  return role !== null && allowed.includes(role);
}
