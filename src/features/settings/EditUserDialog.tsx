import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { SelectField, TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { AdminActionError, updateStaffUser } from "@/features/settings/peopleService";
import { EMAIL_PATTERN } from "@/lib/validation";
import { ROLE_LABELS, type Profile, type Role } from "@/types/domain";

type Errors = Partial<Record<"fullName" | "email" | "role" | "form", string>>;

interface Props {
  user: Profile;
  isSelf: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditUserDialog({ user, isSelf, onClose, onUpdated }: Props) {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (fullName.trim().length < 2) next.fullName = "Enter the person's full name.";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await updateStaffUser({
        userId: user.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: isSelf ? user.role : role,
      });
      onUpdated();
    } catch (err) {
      if (err instanceof AdminActionError) {
        setErrors({ form: err.message });
      } else {
        const msg = err instanceof Error ? err.message : "Failed to update account. Please try again.";
        setErrors({ form: msg });
      }
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`Edit User: ${user.full_name}`}
      description="Update profile information and role assignments."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form ? <InlineAlert>{errors.form}</InlineAlert> : null}

        <TextField
          label="Username"
          value={user.username}
          disabled
          hint="Usernames cannot be changed once created."
        />

        <TextField
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          maxLength={120}
          autoFocus
        />

        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <SelectField
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={isSelf}
          hint={isSelf ? "You cannot change your own role." : undefined}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
