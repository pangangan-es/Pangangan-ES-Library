// Shared helpers for Edge Functions (Deno runtime).

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  const isLocalOrDev =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://192.168.") ||
    origin.startsWith("http://10.") ||
    origin.startsWith("http://172.") ||
    origin.endsWith(".onrender.com");

  if (origin && (allowed.includes(origin) || allowed.includes("*") || isLocalOrDev)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function sha256Hex(value: string): Promise<string> {
  const pepper = Deno.env.get("LOGIN_THROTTLE_PEPPER") ?? "";
  const data = new TextEncoder().encode(`${pepper}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ROLES = ["admin", "librarian", "teacher"] as const;
export type Role = (typeof ROLES)[number];

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}
