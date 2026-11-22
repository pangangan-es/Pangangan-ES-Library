import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { useAuth } from "@/features/auth/AuthProvider";
import { completeFirstPasswordChange } from "@/features/auth/authService";
import { useToast } from "@/components/Toast";

export function ForcePasswordChangeDialog() {
  const { profile, reloadProfile, signOut } = useAuth();
  const { notify } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile?.must_change_password) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }
    if (newPassword === "pangangan123") {
      setError("Please choose a different password from the temporary default password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setBusy(true);
    try {
      await completeFirstPasswordChange(newPassword);
      await reloadProfile();
      notify("success", "Your new password has been set! Welcome to the library system.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password. Please try again.";
      setError(msg);
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-pwd-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-ink-900/10">
        <div className="mb-4">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <span>Action Required</span>
          </div>
          <h2 id="force-pwd-title" className="font-display text-xl font-bold text-ink-900">
            Change Temporary Password
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Hello <strong>{profile.full_name}</strong>! Your account was initialized with the default temporary password.
            Please set a new, secure personal password to continue.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error ? <InlineAlert>{error}</InlineAlert> : null}

          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters."
            required
            autoFocus
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
            <Button type="submit" variant="primary" loading={busy} className="w-full">
              Set New Password & Continue
            </Button>
          </div>
        </form>

        <div className="mt-4 border-t border-ink-100 pt-3 text-center">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-xs text-ink-500 hover:text-ink-800 hover:underline"
          >
            Sign out and return later
          </button>
        </div>
      </div>
    </div>
  );
}
