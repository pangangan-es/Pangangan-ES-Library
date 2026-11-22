// staff-login: sign in with EMAIL or USERNAME plus password.
//
// Why a server function: resolving a username to an email must not expose an
// email directory. This function looks the email up with the service-role key
// (never sent to a browser), performs the password sign-in itself, and returns
// only the resulting session. The client never learns which email belongs to a
// username. All failures return the same generic response.
//
// Abuse controls: failed attempts are counted per identifier and per client IP
// in public.login_attempts; too many in the window returns the same generic
// failure (HTTP 429) without touching Auth.
//
// Required secrets: ALLOWED_ORIGINS. Provided automatically by Supabase:
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Optional: LOGIN_THROTTLE_PEPPER (random string), recommended.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, EMAIL_PATTERN, json, normalizeUsername, sha256Hex } from "../_shared/http.ts";

const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_IDENTIFIER = 8;
const MAX_FAILS_PER_IP = 40;

const GENERIC_FAILURE = { error: "Incorrect sign-in details. Check them and try again." };
const THROTTLED = { error: "Too many attempts. Please wait a few minutes and try again." };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed." });
  }

  let identifier = "";
  let password = "";
  try {
    const body = await req.json();
    identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return json(req, 400, GENERIC_FAILURE);
  }
  if (!identifier || !password || identifier.length > 254 || password.length > 256) {
    return json(req, 400, GENERIC_FAILURE);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const normalized = identifier.includes("@") ? identifier.toLowerCase() : normalizeUsername(identifier);
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const idHash = await sha256Hex(`id:${normalized}`);
  const ipHash = await sha256Hex(`ip:${ip}`);

  // --- throttle check -------------------------------------------------------
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const countFails = async (kind: "identifier" | "ip", hash: string) => {
    const { count } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("key_hash", hash)
      .eq("succeeded", false)
      .gte("attempted_at", since);
    return count ?? 0;
  };
  const [idFails, ipFails] = await Promise.all([countFails("identifier", idHash), countFails("ip", ipHash)]);
  if (idFails >= MAX_FAILS_PER_IDENTIFIER || ipFails >= MAX_FAILS_PER_IP) {
    return json(req, 429, THROTTLED);
  }

  // --- resolve email --------------------------------------------------------
  // Unknown usernames fall through to a sign-in against a placeholder address so
  // both paths do comparable work and return the identical response.
  let email = "no-such-user@invalid.example";
  if (identifier.includes("@")) {
    if (EMAIL_PATTERN.test(identifier)) email = identifier.toLowerCase();
  } else {
    const { data } = await admin
      .from("profiles")
      .select("email, is_active")
      .eq("username_normalized", normalized)
      .maybeSingle();
    if (data?.is_active) email = data.email;
  }

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signIn, error } = await authClient.auth.signInWithPassword({ email, password });

  let ok = !error && !!signIn?.session && !!signIn.user;

  // Must be an active staff profile. Auth accounts without one get nothing.
  if (ok && signIn?.user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", signIn.user.id)
      .maybeSingle();
    ok = !!profile?.is_active;
  }

  await admin.from("login_attempts").insert([
    { kind: "identifier", key_hash: idHash, succeeded: ok },
    { kind: "ip", key_hash: ipHash, succeeded: ok },
  ]);
  // Opportunistic cleanup of old rows (keeps the table small).
  if (Math.random() < 0.05) {
    await admin.from("login_attempts").delete().lt("attempted_at", new Date(Date.now() - 24 * 3_600_000).toISOString());
  }

  if (!ok || !signIn?.session) {
    return json(req, 401, GENERIC_FAILURE);
  }

  return json(req, 200, {
    session: {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    },
  });
});
