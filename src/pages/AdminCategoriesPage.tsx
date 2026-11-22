import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/Dialog";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NameDialog } from "@/features/settings/NameDialog";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/features/settings/referenceService";
import { toMessage } from "@/lib/errors";
import type { Category } from "@/types/domain";

export default function AdminCategoriesPage() {
  const { notify } = useToast();
  const categories = useAsync(() => listCategories(), []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle(c: Category) {
    try {
      await updateCategory(c.id, { is_active: !c.is_active });
      notify("success", c.is_active ? `Deactivated “${c.name}”.` : `Reactivated “${c.name}”.`);
      categories.reload();
    } catch (err) {
      notify("error", toMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteCategory(deleting.id);
      notify("success", `Deleted “${deleting.name}”.`);
      categories.reload();
    } catch (err) {
      notify("error", toMessage(err, "That category is in use. Deactivate it instead."));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  const columns: Column<Category>[] = [
    { header: "Category", cell: (c) => <span className="font-semibold text-ink-900">{c.name}</span> },
    { header: "Status", cell: (c) => (c.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
  ];

  return (
    <div>
      <PageHeader title="Categories" intro="Groups used to organise books. Deactivate a category to stop using it without affecting existing books." action={<Button variant="accent" onClick={() => setEditing("new")}>Add a category</Button>} />
      <div aria-live="polite">
        {categories.loading && !categories.data ? <LoadingBlock label="Loading categories" /> : null}
        {categories.error ? <ErrorState message={categories.error} onRetry={categories.reload} /> : null}
        {categories.data && !categories.error ? (
          categories.data.length === 0 ? (
            <EmptyState title="No categories yet" action={<Button variant="accent" onClick={() => setEditing("new")}>Add a category</Button>}>
              Categories such as Fiction, Science or Filipino help children find books.
            </EmptyState>
          ) : (
            <ResponsiveList
              caption="Categories"
              rows={categories.data}
              rowKey={(c) => c.id}
              columns={columns}
              actions={(c) => (
                <>
                  <Button onClick={() => setEditing(c)} aria-label={`Rename ${c.name}`}>Rename</Button>
                  <Button onClick={() => void toggle(c)} aria-label={`${c.is_active ? "Deactivate" : "Reactivate"} ${c.name}`}>{c.is_active ? "Deactivate" : "Reactivate"}</Button>
                  <Button variant="danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>Delete</Button>
                </>
              )}
            />
          )
        ) : null}
      </div>

      {editing ? (
        <NameDialog
          title={editing === "new" ? "Add a category" : "Rename category"}
          label="Category name"
          initialName={editing === "new" ? "" : editing.name}
          submitLabel={editing === "new" ? "Add category" : "Save"}
          onClose={() => setEditing(null)}
          onSubmit={async (name) => {
            if (editing === "new") await createCategory(name);
            else await updateCategory(editing.id, { name });
            notify("success", editing === "new" ? `Added “${name}”.` : `Renamed to “${name}”.`);
            setEditing(null);
            categories.reload();
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this category?"
          destructive
          confirmLabel="Delete"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
          message={<p>“{deleting.name}” will be removed. If any book uses it, the delete is refused and you can deactivate it instead.</p>}
        />
      ) : null}
    </div>
  );
}
