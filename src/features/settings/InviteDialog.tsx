import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { SelectField, TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { AdminActionError, createStaffUser } from "@/features/settings/peopleService";
import { EMAIL_PATTERN, USERNAME_PATTERN } from "@/lib/validation";
import { ROLE_LABELS, type Role } from "@/types/domain";

type Errors = Partial<Record<"fullName" | "email" | "username" | "role" | "form", string>>;

interface Props {
  onClose: () => void;
  onCreated: (fullName: string, username: string) => void;
}

export function CreateUserDialog({ onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role | "">("librarian");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (fullName.trim().length < 2) next.fullName = "Enter the person's full name.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      next.username = "3 to 32 characters: lowercase letters, numbers, dot, dash or underscore.";
    }
    if (!role) next.role = "Choose a role.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !role) return;

    setBusy(true);
    try {
      await createStaffUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        role,
      });
      onCreated(fullName.trim(), username.trim().toLowerCase());
    } catch (err) {
      if (err instanceof AdminActionError) {
        const field = err.field as keyof Errors | undefined;
        setErrors(field && field in { fullName: 1, email: 1, username: 1, role: 1 } ? { [field]: err.message } : { form: err.message });
      } else {
        const msg = err instanceof Error ? err.message : "The user account could not be created. Please try again.";
        setErrors({ form: msg });
      }
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Create staff user account"
      description="New accounts are initialized with a temporary password. The user will be required to change it on their first sign-in."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form ? <InlineAlert>{errors.form}</InlineAlert> : null}

        <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-3 text-sm text-teal-900">
          <div className="flex items-center justify-between font-semibold">
            <span>Temporary Initial Password:</span>
            <code className="rounded bg-teal-100 px-2 py-0.5 font-mono text-xs font-bold text-teal-950">
              pangangan123
            </code>
          </div>
          <p className="mt-1 text-xs text-teal-700">
            No email is sent. Share the username and temporary password with the staff member. They will set their personal password upon first sign-in.
          </p>
        </div>

        <TextField
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          maxLength={120}
          placeholder="e.g. Maria Santos"
          autoFocus
        />

        <TextField
          label="Email address"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="e.g. maria.santos@gmail.com"
        />

        <TextField
          label="Username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          hint="Used to sign in. 3 to 32 characters, cannot be changed later."
          placeholder="e.g. maria.santos"
          maxLength={32}
        />

        <SelectField
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role | "")}
          error={errors.role}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </SelectField>

        <p className="text-xs text-ink-600">
          <strong>Administrator:</strong> Full system management. <strong>Librarian:</strong> Full system management & circulation. <strong>Teacher:</strong> Read-only catalog access and personal account editing.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Create user account
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Backward compatibility export
export function InviteDialog(props: { onClose: () => void; onInvited: (email: string) => void }) {
  return (
    <CreateUserDialog
      onClose={props.onClose}
      onCreated={(_name, _user) => props.onInvited(_user)}
    />
  );
}
