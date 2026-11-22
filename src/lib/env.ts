// Only the public Supabase URL and public anon/publishable key belong in the
// browser. Both are validated at startup so a bad deployment shows a clear
// configuration screen instead of failing mysteriously.

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

function validate(): string | null {
  if (!rawUrl || !rawKey) {
    return "The app is missing its Supabase settings (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).";
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return "VITE_SUPABASE_URL must use https.";
    }
  } catch {
    return "VITE_SUPABASE_URL is not a valid URL.";
  }
  if (rawKey.startsWith("sb_secret_")) {
    return "A secret key was supplied where the public key belongs. Remove it and use the public anon/publishable key.";
  }
  // Defence in depth: a Supabase service-role JWT has role=service_role in its payload.
  try {
    const payload = rawKey.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      if (decoded.role === "service_role") {
        return "A service-role key was supplied where the public key belongs. Remove it immediately and rotate it in Supabase.";
      }
    }
  } catch {
    // Not a JWT (e.g. a publishable key). That is fine.
  }
  return null;
}

export const configError: string | null = validate();
export const supabaseUrl: string = rawUrl || "http://localhost:54321";
export const supabaseAnonKey: string = rawKey || "missing-key";
