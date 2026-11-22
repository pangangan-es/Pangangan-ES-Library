// admin-users: trusted staff-account administration for admins and librarians.
//
// Actions (POST JSON { action, ... }):
//   create         { fullName, email, username, role }  -> creates Auth user with temp password 'pangangan123'
//   update_user    { userId, fullName, email, role }
//   reset_password { userId }                           -> resets password to 'pangangan123' and sets must_change_password
//   set_role       { userId, role }
//   set_active     { userId, active }                   -> also bans/unbans in Auth
//   delete_user    { userId }                           -> deletes user if no circulation records exist
//
// Security model
//  * Every call verifies that the caller is an active 'admin' or 'librarian'.
//  * Users cannot change their own role, deactivate themselves, or delete themselves.
//
// Required secrets: ALLOWED_ORIGINS. Provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  EMAIL_PATTERN,
  json,
  normalizeUsername,
  ROLES,
  type Role,
  USERNAME_PATTERN,
} from "../_shared/http.ts";

const BAN_FOREVER = "876000h"; // ~100 years
const TEMPORARY_PASSWORD = "pangangan123";

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

async function audit(
  admin: SupabaseClient,
  actor: { id: string; full_name: string },
  action: string,
  rowId: string,
  detail: Record<string, unknown>,
) {
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_name: actor.full_name,
    action,
    table_name: "profiles",
    row_id: rowId,
    detail,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Authenticate caller
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, 401, { error: "Sign in required." });

  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json(req, 401, { error: "Sign in required." });

  const { data: actor } = await admin
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", caller.user.id)
    .maybeSingle();

  // Both Admin and Librarian have full administrative functions over staff accounts
  if (!actor || !actor.is_active || (actor.role !== "admin" && actor.role !== "librarian")) {
    return json(req, 403, { error: "Only administrators and librarians can manage staff accounts." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid request." });
  }

  switch (body.action) {
    // ------------------------------------------------------------------ create
    case "create": {
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const username = typeof body.username === "string" ? normalizeUsername(body.username) : "";
      const role = body.role;

      if (fullName.length < 2 || fullName.length > 120) {
        return json(req, 422, { error: "Enter the full name (2 to 120 characters).", field: "fullName" });
      }
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return json(req, 422, { error: "Enter a valid email address.", field: "email" });
      }
      if (!USERNAME_PATTERN.test(username)) {
        return json(req, 422, {
          error: "Username must be 3 to 32 characters: lowercase letters, numbers, dot, dash or underscore.",
          field: "username",
        });
      }
      if (!isRole(role)) return json(req, 422, { error: "Choose a role.", field: "role" });

      const [byUsername, byEmail] = await Promise.all([
        admin.from("profiles").select("id").eq("username_normalized", username).limit(1),
        admin.from("profiles").select("id").eq("email", email).limit(1),
      ]);
      if ((byUsername.data?.length ?? 0) > 0 || (byEmail.data?.length ?? 0) > 0) {
        return json(req, 409, { error: "That username or email is already in use.", field: "username" });
      }

      // Create Auth user directly with temporary password and pre-confirmed email (no email sent)
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: TEMPORARY_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });
      if (createErr || !newUser?.user) {
        return json(req, 400, { error: createErr?.message ?? "Could not create user account." });
      }

      const { error: profileErr } = await admin.from("profiles").insert({
        id: newUser.user.id,
        full_name: fullName,
        username,
        username_normalized: username,
        email,
        role,
        is_active: true,
        must_change_password: true,
        created_by: actor.id,
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(newUser.user.id);
        return json(req, 409, { error: "That username or email is already in use.", field: "username" });
      }

      await audit(admin, actor, "create_account", newUser.user.id, { role, username, temporary_password: true });
      return json(req, 201, { ok: true, userId: newUser.user.id });
    }

    // ------------------------------------------------------------- update_user
    case "update_user": {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = body.role;

      if (!userId) return json(req, 422, { error: "Invalid user ID." });
      if (fullName.length < 2 || fullName.length > 120) {
        return json(req, 422, { error: "Enter the full name (2 to 120 characters)." });
      }
      if (!EMAIL_PATTERN.test(email)) {
        return json(req, 422, { error: "Enter a valid email address." });
      }
      if (!isRole(role)) return json(req, 422, { error: "Invalid role." });

      if (userId === actor.id && role !== actor.role) {
        return json(req, 403, { error: "You cannot change your own role." });
      }

      // Update Auth email if changed
      const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
        email,
        user_metadata: { full_name: fullName },
      });
      if (authErr) return json(req, 400, { error: authErr.message });

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ full_name: fullName, email, role, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (updateErr) return json(req, 400, { error: updateErr.message });

      await audit(admin, actor, "update_user", userId, { fullName, role });
      return json(req, 200, { ok: true });
    }

    // ---------------------------------------------------------- reset_password
    case "reset_password": {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return json(req, 422, { error: "Invalid request." });

      const { error: resetErr } = await admin.auth.admin.updateUserById(userId, {
        password: TEMPORARY_PASSWORD,
      });
      if (resetErr) return json(req, 400, { error: resetErr.message });

      await admin
        .from("profiles")
        .update({ must_change_password: true, updated_at: new Date().toISOString() })
        .eq("id", userId);

      await audit(admin, actor, "reset_password_temporary", userId, {});
      return json(req, 200, { ok: true });
    }

    // ---------------------------------------------------------------- set_role
    case "set_role": {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!isRole(body.role) || !userId) return json(req, 422, { error: "Invalid request." });
      if (userId === actor.id) {
        return json(req, 403, { error: "You cannot change your own role." });
      }
      const { data: updated, error } = await admin
        .from("profiles")
        .update({ role: body.role })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (error || !updated) return json(req, 404, { error: "Account not found." });
      await audit(admin, actor, "set_role", userId, { role: body.role });
      return json(req, 200, { ok: true });
    }

    // -------------------------------------------------------------- set_active
    case "set_active": {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (typeof body.active !== "boolean" || !userId) return json(req, 422, { error: "Invalid request." });
      if (userId === actor.id) {
        return json(req, 403, { error: "You cannot deactivate your own account." });
      }
      const { data: updated, error } = await admin
        .from("profiles")
        .update({ is_active: body.active })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (error || !updated) return json(req, 404, { error: "Account not found." });

      const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: body.active ? "none" : BAN_FOREVER,
      });
      if (banErr) {
        await admin.from("profiles").update({ is_active: !body.active }).eq("id", userId);
        return json(req, 500, { error: "Could not update the account. No change was made." });
      }
      await audit(admin, actor, body.active ? "activate_account" : "deactivate_account", userId, {});
      return json(req, 200, { ok: true });
    }

    // ------------------------------------------------------------- delete_user
    case "delete_user": {
      const userId = typeof body.userId === "string" ? body.userId : "";
      if (!userId) return json(req, 422, { error: "Invalid request." });
      if (userId === actor.id) {
        return json(req, 403, { error: "You cannot delete your own account." });
      }

      // Check if user has issued loans or returns
      const [loanCount, returnCount] = await Promise.all([
        admin.from("loans").select("id", { count: "exact", head: true }).eq("issued_by", userId),
        admin.from("return_transactions").select("id", { count: "exact", head: true }).eq("received_by", userId),
      ]);

      if ((loanCount.count ?? 0) > 0 || (returnCount.count ?? 0) > 0) {
        return json(req, 400, {
          error: "This staff member has recorded loans or returns in circulation history. Deactivate the account instead of deleting it to preserve the audit trail.",
        });
      }

      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      await audit(admin, actor, "delete_account", userId, {});
      return json(req, 200, { ok: true });
    }

    default:
      return json(req, 400, { error: "Unknown action." });
  }
});
