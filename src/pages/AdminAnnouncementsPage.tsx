import { useState, type FormEvent } from "react";
import { Calendar, Plus, Trash2, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { ConfirmDialog } from "@/components/Dialog";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { AnnouncementDialog } from "@/features/settings/AnnouncementDialog";
import {
  deleteAnnouncement,
  getLibrarySettings,
  listStaffAnnouncements,
  updateAnnouncement,
  updateLibrarySettings,
} from "@/features/settings/announcementService";
import { toMessage } from "@/lib/errors";
import type { Announcement } from "@/types/domain";

export default function AdminAnnouncementsPage() {
  const { notify } = useToast();
  const announcements = useAsync(() => listStaffAnnouncements(), []);
  const settings = useAsync(() => getLibrarySettings(), []);

  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);

  // Settings form state
  const [hours, setHours] = useState("");
  const [quarterName, setQuarterName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  if (settings.data && !settingsLoaded) {
    setHours(settings.data.operating_hours);
    setQuarterName(settings.data.quarter_name);
    setTarget(String(settings.data.quarter_reading_goal_target));
    setCurrent(String(settings.data.quarter_reading_goal_current));
    setSettingsLoaded(true);
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateLibrarySettings({
        operating_hours: hours.trim(),
        quarter_name: quarterName.trim(),
        quarter_reading_goal_target: parseInt(target, 10) || 1000,
        quarter_reading_goal_current: parseInt(current, 10) || 0,
      });
      notify("success", "Updated library hours and reading goal targets.");
      settings.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not save settings."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleToggleActive(a: Announcement) {
    try {
      await updateAnnouncement(a.id, { is_active: !a.is_active });
      notify("success", a.is_active ? `Hidden “${a.title}”.` : `Published “${a.title}”.`);
      announcements.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not update status."));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteAnnouncement(deleting.id);
      notify("success", `Deleted announcement “${deleting.title}”.`);
      setDeleting(null);
      announcements.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not delete announcement."));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Announcement>[] = [
    {
      header: "Headline",
      cell: (a) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink-900">{a.title}</span>
            {a.badge && (
              <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold border border-sky-200">
                {a.badge}
              </span>
            )}
            {a.is_sample && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                Sample
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-xs text-ink-600 mt-1 max-w-md">{a.content}</p>
        </div>
      ),
    },
    {
      header: "Event Date",
      cell: (a) =>
        a.event_date ? (
          <span className="inline-flex items-center gap-1 text-xs text-ink-700">
            <Calendar className="h-3.5 w-3.5 text-ink-400" />
            {a.event_date}
          </span>
        ) : (
          <span className="text-xs text-ink-400">Ongoing</span>
        ),
    },
    {
      header: "Status",
      cell: (a) =>
        a.is_active ? (
          <Badge tone="good">Active on Home</Badge>
        ) : (
          <Badge tone="neutral">Draft / Hidden</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* -------------------------------------------------------------------
          SECTION 1: LIBRARY ANNOUNCEMENTS & BULLETIN
         ------------------------------------------------------------------- */}
      <section className="space-y-6">
        <PageHeader
          title="Library Bulletin & Announcements"
          intro="Publish literacy events, story hours, and reading drives displayed on the public school library homepage."
          action={
            <Button variant="accent" onClick={() => setEditing("new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Post Announcement
            </Button>
          }
        />

        <div aria-live="polite">
          {announcements.loading && !announcements.data ? (
            <LoadingBlock label="Loading announcements" />
          ) : null}

          {announcements.error ? (
            <ErrorState message={announcements.error} onRetry={announcements.reload} />
          ) : null}

          {announcements.data && !announcements.error ? (
            announcements.data.length === 0 ? (
              <EmptyState
                title="No announcements yet"
                action={
                  <Button variant="accent" onClick={() => setEditing("new")}>
                    Post the first announcement
                  </Button>
                }
              >
                Post library news, book fairs, or Friday storytelling schedules for students and parents.
              </EmptyState>
            ) : (
              <ResponsiveList
                caption="Announcements"
                rows={announcements.data}
                rowKey={(a) => a.id}
                columns={columns}
                actions={(a) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="secondary"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => setEditing(a)}
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => void handleToggleActive(a)}
                    >
                      {a.is_active ? "Hide" : "Publish"}
                    </Button>
                    <Button
                      variant="danger"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => setDeleting(a)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                )}
              />
            )
          ) : null}
        </div>
      </section>

      {/* -------------------------------------------------------------------
          SECTION 2: LIBRARY HOURS & READING GOAL TARGETS
         ------------------------------------------------------------------- */}
      <section className="space-y-4 pt-6 border-t border-ink-100">
        <div>
          <h2 className="font-display text-xl font-bold text-navy-900">
            Library Operating Hours & School Reading Goals
          </h2>
          <p className="text-sm text-ink-600 mt-0.5">
            Update the operating schedule and reading progress counter shown on the student home page.
          </p>
        </div>

        {settings.loading && !settings.data ? (
          <LoadingBlock label="Loading settings" />
        ) : (
          <form
            onSubmit={handleSaveSettings}
            className="rounded-3xl border border-[#EAE2D3] bg-white p-6 shadow-storybook max-w-3xl space-y-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Library Operating Hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. Mon – Fri, 7:30 AM – 4:30 PM"
                maxLength={60}
              />

              <TextField
                label="Quarter Name / Challenge"
                value={quarterName}
                onChange={(e) => setQuarterName(e.target.value)}
                placeholder="e.g. Q2 Reading Adventure"
                maxLength={60}
              />

              <TextField
                label="Quarter Reading Target (Books)"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 1200"
              />

              <TextField
                label="Current Books Read"
                type="number"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="e.g. 840"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" loading={savingSettings}>
                Save Operating Settings
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Edit / Create Announcement Dialog */}
      {editing ? (
        <AnnouncementDialog
          announcement={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            notify("success", msg);
            setEditing(null);
            announcements.reload();
          }}
        />
      ) : null}

      {/* Delete Confirm Dialog */}
      {deleting ? (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          message="This announcement will be permanently removed from the system."
          confirmLabel="Delete announcement"
          destructive
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
