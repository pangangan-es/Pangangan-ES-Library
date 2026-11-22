import { supabase } from "@/lib/supabase";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { sanitizeSearch } from "@/lib/search";
import type { Borrower, Profile, Role } from "@/types/domain";

export class AdminActionError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "AdminActionError";
  }
}

type AdminPayload =
  | { action: "create"; fullName: string; email: string; username: string; role: Role }
  | { action: "update_user"; userId: string; fullName: string; email: string; role: Role }
  | { action: "reset_password"; userId: string }
  | { action: "set_role"; userId: string; role: Role }
  | { action: "set_active"; userId: string; active: boolean }
  | { action: "delete_user"; userId: string }
  | { action: "send_password_email"; userId: string };

/** Calls the trusted admin-users Edge Function. */
async function callAdminUsers(payload: AdminPayload): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminActionError("Your session has expired. Please sign in again.");

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AdminActionError("Cannot reach the library server. Check your internet connection and try again.");
  }
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as { error?: string; field?: string } | null;
  throw new AdminActionError(body?.error ?? "That did not work. Please try again.", body?.field);
}

export async function listStaffAccounts(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, email, role, is_active, must_change_password, created_at")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export const createStaffUser = (input: { fullName: string; email: string; username: string; role: Role }) =>
  callAdminUsers({ action: "create", ...input });

export const inviteStaff = createStaffUser; // Backward compatibility

export const updateStaffUser = (input: { userId: string; fullName: string; email: string; role: Role }) =>
  callAdminUsers({ action: "update_user", ...input });

export const resetUserPassword = (userId: string) =>
  callAdminUsers({ action: "reset_password", userId });

export const changeRole = (userId: string, role: Role) =>
  callAdminUsers({ action: "set_role", userId, role });

export const setAccountActive = (userId: string, active: boolean) =>
  callAdminUsers({ action: "set_active", userId, active });

export const deleteStaffUser = (userId: string) =>
  callAdminUsers({ action: "delete_user", userId });

export const sendPasswordEmail = (userId: string) =>
  callAdminUsers({ action: "send_password_email", userId });

export async function updateMyProfile(fullName: string): Promise<void> {
  const { error } = await supabase.rpc("update_my_profile", { p_full_name: fullName.trim() });
  if (error) {
    // Fallback: try update_own_name if update_my_profile is not loaded
    const { error: err2 } = await supabase.rpc("update_own_name", { p_full_name: fullName.trim() });
    if (err2) throw err2;
  }
}

// ---- borrower directory (records only, never login accounts) -----------------
export async function listBorrowers(search: string, limit = 200): Promise<Borrower[]> {
  let query = supabase
    .from("borrowers")
    .select("id, full_name, borrower_type, grade_level_id, section_id, is_active")
    .order("full_name")
    .limit(limit);
  const term = sanitizeSearch(search);
  if (term) query = query.ilike("full_name", `%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Borrower[];
}

export async function setBorrowerActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("borrowers").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}
