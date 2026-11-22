import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { InlineAlert, LoadingBlock } from "@/components/Feedback";
import { updatePassword } from "@/features/auth/authService";
import { MIN_PASSWORD_LENGTH, validatePassword } from "@/lib/validation";

/**
 * Landing page for invitation and password-recovery emails. It only works with
 * a valid, unexpired link (Supabase puts a temporary session in the URL).
 * It is not a registration page: it cannot create an account.
 */
export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) setSession(next);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setSession(s.session);
    });
    // Give the client a moment to read tokens from the URL before declaring the link invalid.
    const t = window.setTimeout(() => setChecked(true), 2500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const pwError = validatePassword(password);
    if (pwError) next.password = pwError;
    if (confirm !== password) next.confirm = "The two passwords do not match.";
    setErrors(next);
    if (next.password || next.confirm) return;

    setBusy(true);
    const message = await updatePassword(password);
    setBusy(false);
    if (message) {
      setErrors({ form: "Could not save the password. The link may have expired; request a new one from the sign-in page." });
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate("/staff", { replace: true }), 1200);
  }

  if (!session && !checked) return <LoadingBlock label="Checking your link" />;

  if (!session) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-semibold text-ink-900">This link cannot be used</h1>
        <p className="mt-2 text-ink-700">The link is invalid or has expired. Request a new password email from the sign-in page, or ask the library administrator to send one.</p>
        <Link to="/login" className="mt-4 inline-flex min-h-[44px] items-center font-semibold text-teal-700 underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Choose your password</h1>
      <p className="mt-2 text-ink-700">Create a password for your library staff account. Only you will know it.</p>
      {done ? (
        <div className="mt-6">
          <InlineAlert kind="success">Password saved. Taking you to the staff workspace…</InlineAlert>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-ink-100 bg-white p-5">
          {errors.form ? <InlineAlert>{errors.form}</InlineAlert> : null}
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
          <Button type="submit" variant="primary" loading={busy} className="w-full">
            Save password
          </Button>
        </form>
      )}
    </div>
  );
}
