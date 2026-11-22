import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { InlineAlert, LoadingBlock } from "@/components/Feedback";
import { useAuth } from "@/features/auth/AuthProvider";
import { requestPasswordReset, SignInError } from "@/features/auth/authService";
import { EMAIL_PATTERN } from "@/lib/validation";

export default function LoginPage() {
  const { status, signIn, signOut, noAccess } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recovering, setRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | undefined>();
  const [recoverySent, setRecoverySent] = useState(false);

  if (status === "loading") return <LoadingBlock label="Checking your session" />;
  if (status === "signedIn") return <Navigate to={from && from.startsWith("/") ? from : "/staff"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your email or username and your password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(err instanceof SignInError ? err.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  async function onRecover(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(recoveryEmail.trim())) {
      setRecoveryError("Enter the email address of your staff account.");
      return;
    }
    setRecoveryError(undefined);
    setBusy(true);
    await requestPasswordReset(recoveryEmail);
    setBusy(false);
    setRecoverySent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Staff sign in</h1>
      <p className="mt-2 text-ink-700">
        For library staff only. Accounts are created by the library administrator; there is no public sign-up. Anyone can{" "}
        <Link to="/catalog" className="font-semibold text-teal-700 underline">
          browse the catalog
        </Link>{" "}
        without signing in.
      </p>

      {noAccess ? (
        <div className="mt-4">
          <InlineAlert kind="warn">This sign-in has no active staff account. Contact the library administrator.</InlineAlert>
          <Button className="mt-2" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      ) : null}

      {!recovering ? (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-ink-100 bg-white p-5">
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <TextField
            label="Email or username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            maxLength={254}
          />
          <div>
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
            />
            <button
              type="button"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="mt-1 min-h-[44px] text-sm font-semibold text-teal-700 underline"
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          <Button type="submit" variant="primary" loading={busy} className="w-full">
            Sign in
          </Button>
          <button type="button" onClick={() => setRecovering(true)} className="min-h-[44px] text-sm font-semibold text-teal-700 underline">
            Forgot your password?
          </button>
        </form>
      ) : (
        <form onSubmit={onRecover} noValidate className="mt-6 space-y-4 rounded-lg border border-ink-100 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Reset your password</h2>
          {recoverySent ? (
            <InlineAlert kind="success">
              If that email belongs to a staff account, a password link has been sent. Check your inbox and spam folder.
            </InlineAlert>
          ) : (
            <>
              <p className="text-sm text-ink-700">Enter your account email and we will send you a link to choose a new password.</p>
              <TextField
                label="Email address"
                type="email"
                autoComplete="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                error={recoveryError}
              />
              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Send reset link
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setRecovering(false);
              setRecoverySent(false);
            }}
            className="min-h-[44px] text-sm font-semibold text-teal-700 underline"
          >
            Back to sign in
          </button>
        </form>
      )}
    </div>
  );
}
