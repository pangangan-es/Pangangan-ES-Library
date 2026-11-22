import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateMyProfile } from "@/features/settings/peopleService";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ROLE_LABELS } from "@/types/domain";
import { formatDate } from "@/lib/format";

export default function AccountPage() {
  const { profile, role, reloadProfile } = useAuth();
  const { notify } = useToast();

  // Profile Edit State
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);

    const trimmed = fullName.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      setProfileError("Full name must be between 2 and 120 characters.");
      return;
    }

    setProfileBusy(true);
    try {
      await updateMyProfile(trimmed);
      await reloadProfile();
      notify("success", "Your profile name has been updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile name.";
      setProfileError(msg);
    } finally {
      setProfileBusy(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError(null);

    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match. Please re-enter.");
      return;
    }

    setPwdBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      notify("success", "Your password has been changed successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      setPwdError(msg);
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="My Account"
        intro="View your account information and manage your personal details and password."
      />

      {/* Account summary banner */}
      <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-xl font-bold text-white shadow-inner">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-900">{profile?.full_name}</h2>
              <p className="text-sm text-ink-500 font-mono">@{profile?.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
              {role ? ROLE_LABELS[role] : "Staff"}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
              Active Account
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-ink-100 pt-4 text-sm">
          <div>
            <span className="text-ink-500 block text-xs">Email Address</span>
            <span className="font-medium text-ink-900">{profile?.email}</span>
          </div>
          <div>
            <span className="text-ink-500 block text-xs">Member Since</span>
            <span className="font-medium text-ink-900">
              {profile?.created_at ? formatDate(profile.created_at) : "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Info Form */}
        <section className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">Personal Information</h3>
            <p className="text-xs text-ink-600">Update how your name appears across the library system.</p>
          </div>

          <form onSubmit={onSaveProfile} className="space-y-4">
            {profileError ? <InlineAlert>{profileError}</InlineAlert> : null}

            <TextField
              label="Username"
              value={profile?.username ?? ""}
              disabled
              hint="Your login username cannot be changed."
            />

            <TextField
              label="Email"
              value={profile?.email ?? ""}
              disabled
              hint="Managed by school administrators."
            />

            <TextField
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={120}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={profileBusy}>
                Save profile
              </Button>
            </div>
          </form>
        </section>

        {/* Change Password Form */}
        <section className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900">Change Password</h3>
            <p className="text-xs text-ink-600">Set a new personal password for your account.</p>
          </div>

          <form onSubmit={onChangePassword} className="space-y-4">
            {pwdError ? <InlineAlert>{pwdError}</InlineAlert> : null}

            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters."
              required
            />

            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="secondary" loading={pwdBusy}>
                Update password
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
