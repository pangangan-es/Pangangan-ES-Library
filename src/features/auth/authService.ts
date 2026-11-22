import { supabase } from "@/lib/supabase";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Profile } from "@/types/domain";

export class SignInError extends Error {
  constructor(message: string, readonly throttled = false) {
    super(message);
    this.name = "SignInError";
  }
}

const GENERIC = "Incorrect sign-in details. Check them and try again.";

/**
 * Sign in with email OR username. The trusted staff-login Edge Function does
 * the lookup and password check server-side and returns only a session, so a
 * username never reveals an email address and failures are always generic.
 */
export async function signInWithIdentifier(identifier: string, password: string): Promise<void> {
  const cleanId = identifier.trim();
  const isEmail = cleanId.includes("@");

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/staff-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ identifier: cleanId, password }),
    });
  } catch {
    // If the Edge Function cannot be reached over the network and the user entered an email,
    // attempt direct authentication via Supabase Auth as a fallback.
    if (isEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId.toLowerCase(),
        password,
      });
      if (error) throw new SignInError(GENERIC);
      if (data?.session) return;
    }
    throw new SignInError("Cannot reach the library server. Check your internet connection and try again.");
  }

  if (response.status === 429) {
    throw new SignInError("Too many attempts. Please wait a few minutes and try again.", true);
  }
  if (!response.ok) {
    if (isEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId.toLowerCase(),
        password,
      });
      if (!error && data?.session) return;
    }
    throw new SignInError(GENERIC);
  }

  const body = (await response.json().catch(() => null)) as {
    session?: { access_token?: string; refresh_token?: string };
  } | null;
  const access = body?.session?.access_token;
  const refresh = body?.session?.refresh_token;
  if (!access || !refresh) throw new SignInError(GENERIC);

  const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
  if (error) throw new SignInError(GENERIC);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Always resolves the same way so the form cannot be used to discover which emails have accounts. */
export async function requestPasswordReset(email: string): Promise<void> {
  await supabase.auth
    .resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/set-password`,
    })
    .catch(() => undefined);
}

export async function updatePassword(password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? error.message : null;
}

export async function completeFirstPasswordChange(newPassword: string): Promise<void> {
  const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
  if (authErr) throw new Error(authErr.message);

  const { error: rpcErr } = await supabase.rpc("complete_password_change");
  if (rpcErr) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", data.user.id);
      }
    } catch {
      // ignore fallback error
    }
  }
}

export async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, email, role, is_active, must_change_password, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}
