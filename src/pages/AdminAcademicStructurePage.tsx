import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/Dialog";
import { SelectField, TextField } from "@/components/Fields";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NameDialog } from "@/features/settings/NameDialog";
import {
  createGradeLevel,
  createSection,
  deleteGradeLevel,
  deleteSection,
  listGradeLevels,
  listSections,
  updateGradeLevel,
  updateSection,
} from "@/features/settings/referenceService";
import { toMessage } from "@/lib/errors";
import { parseWholeNumber } from "@/lib/validation";
import type { GradeLevel, Section } from "@/types/domain";

type GradeEdit = GradeLevel | "new" | null;
type SectionEdit = Section | "new" | null;
type Deleting = { kind: "grade"; item: GradeLevel } | { kind: "section"; item: Section } | null;

const status = (active: boolean) => (active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Inactive</Badge>);

export default function AdminAcademicStructurePage() {
  const { notify } = useToast();
  const grades = useAsync(() => listGradeLevels(), []);
  const sections = useAsync(() => listSections(), []);
  const [gradeEdit, setGradeEdit] = useState<GradeEdit>(null);
  const [sectionEdit, setSectionEdit] = useState<SectionEdit>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [busy, setBusy] = useState(false);

  // Extra field state for the dialogs.
  const [sortOrder, setSortOrder] = useState("0");
  const [sortError, setSortError] = useState<string | undefined>();
  const [sectionGrade, setSectionGrade] = useState("");

  const gradeName = (id: string | null) => (id ? grades.data?.find((g) => g.id === id)?.name ?? "Unknown" : "No grade level");

  function openGrade(g: GradeEdit) {
    setSortOrder(g && g !== "new" ? String(g.sort_order) : String((grades.data?.length ?? 0)));
    setSortError(undefined);
    setGradeEdit(g);
  }
  function openSection(s: SectionEdit) {
    setSectionGrade(s && s !== "new" ? s.grade_level_id ?? "" : "");
    setSectionEdit(s);
  }

  async function toggleGrade(g: GradeLevel) {
    try {
      await updateGradeLevel(g.id, { is_active: !g.is_active });
      notify("success", g.is_active ? `Deactivated ${g.name}.` : `Reactivated ${g.name}.`);
      grades.reload();
    } catch (err) {
      notify("error", toMessage(err));
    }
  }
  async function toggleSection(s: Section) {
    try {
      await updateSection(s.id, { is_active: !s.is_active });
      notify("success", s.is_active ? `Deactivated ${s.name}.` : `Reactivated ${s.name}.`);
      sections.reload();
    } catch (err) {
      notify("error", toMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.kind === "grade") {
        await deleteGradeLevel(deleting.item.id);
        grades.reload();
      } else {
        await deleteSection(deleting.item.id);
        sections.reload();
      }
      notify("success", `Deleted ${deleting.item.name}.`);
    } catch (err) {
      notify("error", toMessage(err, "That is used by existing records. Deactivate it instead."));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  const gradeColumns: Column<GradeLevel>[] = [
    { header: "Grade level", cell: (g) => <span className="font-semibold text-ink-900">{g.name}</span> },
    { header: "Display order", cell: (g) => g.sort_order },
    { header: "Status", cell: (g) => status(g.is_active) },
  ];
  const sectionColumns: Column<Section>[] = [
    { header: "Section", cell: (s) => <span className="font-semibold text-ink-900">{s.name}</span> },
    { header: "Grade level", cell: (s) => gradeName(s.grade_level_id) },
    { header: "Status", cell: (s) => status(s.is_active) },
  ];

  return (
    <div className="space-y-12">
      <PageHeader title="Grades and sections" intro="The classes borrowers belong to. Past loans keep the names they were recorded with, so renaming or deactivating never rewrites history." />

      <section aria-labelledby="grades-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="grades-h" className="font-display text-xl font-semibold">Grade levels</h2>
          <Button variant="accent" onClick={() => openGrade("new")}>Add a grade level</Button>
        </div>
        {grades.loading && !grades.data ? <LoadingBlock label="Loading grade levels" /> : null}
        {grades.error ? <ErrorState message={grades.error} onRetry={grades.reload} /> : null}
        {grades.data && !grades.error ? (
          grades.data.length === 0 ? (
            <EmptyState title="No grade levels yet">Add Kindergarten and Grades 1 to 6 to get started.</EmptyState>
          ) : (
            <ResponsiveList
              caption="Grade levels"
              rows={grades.data}
              rowKey={(g) => g.id}
              columns={gradeColumns}
              actions={(g) => (
                <>
                  <Button onClick={() => openGrade(g)} aria-label={`Edit ${g.name}`}>Edit</Button>
                  <Button onClick={() => void toggleGrade(g)} aria-label={`${g.is_active ? "Deactivate" : "Reactivate"} ${g.name}`}>{g.is_active ? "Deactivate" : "Reactivate"}</Button>
                  <Button variant="danger" onClick={() => setDeleting({ kind: "grade", item: g })} aria-label={`Delete ${g.name}`}>Delete</Button>
                </>
              )}
            />
          )
        ) : null}
      </section>

      <section aria-labelledby="sections-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="sections-h" className="font-display text-xl font-semibold">Sections</h2>
          <Button variant="accent" onClick={() => openSection("new")}>Add a section</Button>
        </div>
        {sections.loading && !sections.data ? <LoadingBlock label="Loading sections" /> : null}
        {sections.error ? <ErrorState message={sections.error} onRetry={sections.reload} /> : null}
        {sections.data && !sections.error ? (
          sections.data.length === 0 ? (
            <EmptyState title="No sections yet">Add sections such as Rizal or Mabini, or “Faculty” for teachers.</EmptyState>
          ) : (
            <ResponsiveList
              caption="Sections"
              rows={sections.data}
              rowKey={(s) => s.id}
              columns={sectionColumns}
              actions={(s) => (
                <>
                  <Button onClick={() => openSection(s)} aria-label={`Edit ${s.name}`}>Edit</Button>
                  <Button onClick={() => void toggleSection(s)} aria-label={`${s.is_active ? "Deactivate" : "Reactivate"} ${s.name}`}>{s.is_active ? "Deactivate" : "Reactivate"}</Button>
                  <Button variant="danger" onClick={() => setDeleting({ kind: "section", item: s })} aria-label={`Delete ${s.name}`}>Delete</Button>
                </>
              )}
            />
          )
        ) : null}
      </section>

      {gradeEdit ? (
        <NameDialog
          title={gradeEdit === "new" ? "Add a grade level" : "Edit grade level"}
          label="Grade level name"
          maxLength={40}
          initialName={gradeEdit === "new" ? "" : gradeEdit.name}
          submitLabel={gradeEdit === "new" ? "Add grade level" : "Save"}
          extra={<TextField label="Display order" inputMode="numeric" hint="Lower numbers appear first." value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} error={sortError} />}
          onClose={() => setGradeEdit(null)}
          onSubmit={async (name) => {
            const order = parseWholeNumber(sortOrder);
            if (order === null) {
              setSortError("Enter a whole number.");
              throw new Error("invalid order");
            }
            if (gradeEdit === "new") await createGradeLevel(name, order);
            else await updateGradeLevel(gradeEdit.id, { name, sort_order: order });
            notify("success", `Saved ${name}.`);
            setGradeEdit(null);
            grades.reload();
          }}
        />
      ) : null}

      {sectionEdit ? (
        <NameDialog
          title={sectionEdit === "new" ? "Add a section" : "Edit section"}
          label="Section name"
          initialName={sectionEdit === "new" ? "" : sectionEdit.name}
          submitLabel={sectionEdit === "new" ? "Add section" : "Save"}
          extra={
            <SelectField label="Grade level" value={sectionGrade} onChange={(e) => setSectionGrade(e.target.value)} hint="Leave as “No grade level” for groups like Faculty.">
              <option value="">No grade level</option>
              {(grades.data ?? []).filter((g) => g.is_active || g.id === sectionGrade).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </SelectField>
          }
          onClose={() => setSectionEdit(null)}
          onSubmit={async (name) => {
            if (sectionEdit === "new") await createSection(name, sectionGrade || null);
            else await updateSection(sectionEdit.id, { name, grade_level_id: sectionGrade || null });
            notify("success", `Saved ${name}.`);
            setSectionEdit(null);
            sections.reload();
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={deleting.kind === "grade" ? "Delete this grade level?" : "Delete this section?"}
          destructive
          confirmLabel="Delete"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
          message={<p>“{deleting.item.name}” will be removed. If any loan, borrower or section refers to it, the delete is refused and you can deactivate it instead.</p>}
        />
      ) : null}
    </div>
  );
}
