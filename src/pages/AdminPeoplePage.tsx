import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/Dialog";
import { TextField } from "@/components/Fields";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { useAuth } from "@/features/auth/AuthProvider";
import { CreateUserDialog } from "@/features/settings/InviteDialog";
import { EditUserDialog } from "@/features/settings/EditUserDialog";
import {
  AdminActionError,
  deleteStaffUser,
  listBorrowers,
  listStaffAccounts,
  resetUserPassword,
  setAccountActive,
  setBorrowerActive,
} from "@/features/settings/peopleService";
import { listGradeLevels, listSections } from "@/features/settings/referenceService";
import { toMessage } from "@/lib/errors";
import { BORROWER_TYPE_LABELS, ROLE_LABELS, type Borrower, type Profile } from "@/types/domain";

type Pending =
  | { kind: "deactivate" | "activate"; person: Profile }
  | { kind: "reset_pwd"; person: Profile }
  | { kind: "delete"; person: Profile };

export default function AdminPeoplePage() {
  const { notify } = useToast();
  const { profile: me } = useAuth();
  const staff = useAsync(() => listStaffAccounts(), []);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const [borrowerSearch, setBorrowerSearch] = useState("");
  const debouncedBorrower = useDebounced(borrowerSearch);
  const borrowers = useAsync(() => listBorrowers(debouncedBorrower), [debouncedBorrower]);
  const grades = useAsync(() => listGradeLevels(), []);
  const sections = useAsync(() => listSections(), []);

  const message = (err: unknown) => (err instanceof AdminActionError ? err.message : toMessage(err));

  async function runPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "reset_pwd") {
        await resetUserPassword(pending.person.id);
        notify("success", `Password for ${pending.person.full_name} reset to "pangangan123". They must change it upon next sign-in.`);
      } else if (pending.kind === "delete") {
        await deleteStaffUser(pending.person.id);
        notify("success", `Account for ${pending.person.full_name} has been deleted.`);
      } else {
        await setAccountActive(pending.person.id, pending.kind === "activate");
        notify(
          "success",
          pending.kind === "activate"
            ? `${pending.person.full_name} can sign in again.`
            : `${pending.person.full_name} has been deactivated.`
        );
      }
      staff.reload();
    } catch (err) {
      notify("error", message(err));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function toggleBorrower(b: Borrower) {
    try {
      await setBorrowerActive(b.id, !b.is_active);
      notify("success", b.is_active ? `${b.full_name} hidden from suggestions.` : `${b.full_name} is active again.`);
      borrowers.reload();
    } catch (err) {
      notify("error", toMessage(err));
    }
  }

  const staffColumns: Column<Profile>[] = [
    {
      header: "Name",
      cell: (p) => (
        <div>
          <span className="font-semibold text-ink-900">
            {p.full_name}
            {p.id === me?.id ? " (you)" : ""}
          </span>
          <div className="text-xs text-ink-500 font-mono">@{p.username}</div>
        </div>
      ),
    },
    {
      header: "Email",
      cell: (p) => <span className="break-all text-sm text-ink-700">{p.email}</span>,
    },
    {
      header: "Role",
      cell: (p) => (
        <span className="inline-flex items-center rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-800">
          {ROLE_LABELS[p.role]}
        </span>
      ),
    },
    {
      header: "Password",
      cell: (p) =>
        p.must_change_password ? (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
            Temporary (pangangan123)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
            ✓ Set by user
          </span>
        ),
    },
    {
      header: "Status",
      cell: (p) => (p.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>),
    },
  ];

  const gradeName = (id: string | null) => (id ? grades.data?.find((g) => g.id === id)?.name : undefined);
  const sectionName = (id: string | null) => (id ? sections.data?.find((s) => s.id === id)?.name : undefined);

  const borrowerColumns: Column<Borrower>[] = [
    { header: "Name", cell: (b) => <span className="font-semibold text-ink-900">{b.full_name}</span> },
    { header: "Type", cell: (b) => BORROWER_TYPE_LABELS[b.borrower_type] },
    {
      header: "Class",
      cell: (b) => [gradeName(b.grade_level_id), sectionName(b.section_id)].filter(Boolean).join(" · ") || "Not recorded",
    },
    { header: "Status", cell: (b) => (b.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Hidden</Badge>) },
  ];

  return (
    <div className="space-y-12">
      <section aria-labelledby="staff-h">
        <PageHeader
          title="User accounts & permissions"
          intro="Administrators and Librarians can manage all staff user accounts in the system. New users receive the temporary password 'pangangan123'."
          action={
            <Button variant="accent" onClick={() => setCreating(true)}>
              + Add new user
            </Button>
          }
        />
        <h2 id="staff-h" className="mb-3 font-display text-xl font-semibold">
          Staff User Accounts
        </h2>

        {staff.loading && !staff.data ? <LoadingBlock label="Loading accounts" /> : null}
        {staff.error ? <ErrorState message={staff.error} onRetry={staff.reload} /> : null}
        {staff.data && !staff.error ? (
          staff.data.length === 0 ? (
            <EmptyState title="No staff accounts">Create the first staff user account.</EmptyState>
          ) : (
            <ResponsiveList
              caption="Staff accounts"
              rows={staff.data}
              rowKey={(p) => p.id}
              columns={staffColumns}
              actions={(p) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="secondary"
                    className="!min-h-[36px] !py-1 text-xs"
                    onClick={() => setEditingUser(p)}
                    aria-label={`Edit ${p.full_name}`}
                  >
                    Edit
                  </Button>

                  {p.id !== me?.id ? (
                    <>
                      <Button
                        variant="secondary"
                        className="!min-h-[36px] !py-1 text-xs"
                        onClick={() => setPending({ kind: "reset_pwd", person: p })}
                        aria-label={`Reset password for ${p.full_name}`}
                      >
                        Reset password
                      </Button>

                      {p.is_active ? (
                        <Button
                          variant="danger"
                          className="!min-h-[36px] !py-1 text-xs"
                          onClick={() => setPending({ kind: "deactivate", person: p })}
                          aria-label={`Deactivate ${p.full_name}`}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="!min-h-[36px] !py-1 text-xs"
                          onClick={() => setPending({ kind: "activate", person: p })}
                          aria-label={`Reactivate ${p.full_name}`}
                        >
                          Reactivate
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        className="!min-h-[36px] !py-1 text-xs opacity-75 hover:opacity-100"
                        onClick={() => setPending({ kind: "delete", person: p })}
                        aria-label={`Delete ${p.full_name}`}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-ink-500 italic pl-1">(Current session)</span>
                  )}
                </div>
              )}
            />
          )
        ) : null}
      </section>

      <section aria-labelledby="borrowers-h">
        <h2 id="borrowers-h" className="mb-1 font-display text-xl font-semibold">
          Borrower directory
        </h2>
        <p className="mb-3 max-w-2xl text-ink-700">
          Students and teachers who borrow books are tracked here. They do not have login accounts.
        </p>
        <div className="mb-4 max-w-md">
          <TextField
            label="Search borrowers"
            type="search"
            value={borrowerSearch}
            onChange={(e) => setBorrowerSearch(e.target.value)}
          />
        </div>
        {borrowers.loading && !borrowers.data ? <LoadingBlock label="Loading borrowers" /> : null}
        {borrowers.error ? <ErrorState message={borrowers.error} onRetry={borrowers.reload} /> : null}
        {borrowers.data && !borrowers.error ? (
          borrowers.data.length === 0 ? (
            <EmptyState title="No borrowers found">
              {debouncedBorrower
                ? "Try a different name."
                : "Borrowers appear here after their first remembered checkout."}
            </EmptyState>
          ) : (
            <ResponsiveList
              caption="Borrower directory"
              rows={borrowers.data}
              rowKey={(b) => b.id}
              columns={borrowerColumns}
              actions={(b) => (
                <Button
                  onClick={() => void toggleBorrower(b)}
                  aria-label={`${b.is_active ? "Hide" : "Show"} ${b.full_name}`}
                >
                  {b.is_active ? "Hide" : "Show again"}
                </Button>
              )}
            />
          )
        ) : null}
      </section>

      {creating ? (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={(name, username) => {
            setCreating(false);
            notify("success", `Account created for ${name} (@${username}) with temporary password "pangangan123".`);
            staff.reload();
          }}
        />
      ) : null}

      {editingUser ? (
        <EditUserDialog
          user={editingUser}
          isSelf={editingUser.id === me?.id}
          onClose={() => setEditingUser(null)}
          onUpdated={() => {
            setEditingUser(null);
            notify("success", `Account details updated for ${editingUser.full_name}.`);
            staff.reload();
          }}
        />
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={
            pending.kind === "reset_pwd"
              ? "Reset password to temporary default?"
              : pending.kind === "delete"
              ? "Delete this user account?"
              : pending.kind === "deactivate"
              ? "Deactivate this account?"
              : "Reactivate this account?"
          }
          destructive={pending.kind === "deactivate" || pending.kind === "delete"}
          confirmLabel={
            pending.kind === "reset_pwd"
              ? "Reset to pangangan123"
              : pending.kind === "delete"
              ? "Delete account"
              : pending.kind === "deactivate"
              ? "Deactivate"
              : "Reactivate"
          }
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void runPending()}
          message={
            pending.kind === "reset_pwd" ? (
              <p>
                The password for <strong>{pending.person.full_name}</strong> will be reset to{" "}
                <code className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded text-amber-950">
                  pangangan123
                </code>
                . They will be forced to change it upon their next sign-in.
              </p>
            ) : pending.kind === "delete" ? (
              <p>
                Are you sure you want to permanently delete the account for <strong>{pending.person.full_name}</strong>?
                This action cannot be undone. Accounts with existing loan history cannot be deleted.
              </p>
            ) : pending.kind === "deactivate" ? (
              <p>
                <strong>{pending.person.full_name}</strong> will be immediately signed out and blocked from logging in.
                Their circulation history will be preserved.
              </p>
            ) : (
              <p>
                <strong>{pending.person.full_name}</strong> will be able to sign in again.
              </p>
            )
          }
        />
      ) : null}
    </div>
  );
}
