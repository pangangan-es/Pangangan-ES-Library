import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/Button";
import { CheckboxField, TextAreaField, TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { createAnnouncement, updateAnnouncement } from "@/features/settings/announcementService";
import { toMessage } from "@/lib/errors";
import type { Announcement } from "@/types/domain";

interface Props {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export function AnnouncementDialog({ announcement, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [eventDate, setEventDate] = useState(announcement?.event_date ?? "");
  const [badge, setBadge] = useState(announcement?.badge ?? "");
  const [isActive, setIsActive] = useState(announcement?.is_active ?? true);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError("Please enter an announcement headline (at least 2 characters).");
      return;
    }
    if (content.trim().length < 2) {
      setError("Please enter announcement details.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (announcement) {
        await updateAnnouncement(announcement.id, {
          title: title.trim(),
          content: content.trim(),
          event_date: eventDate || null,
          badge: badge.trim() || null,
          is_active: isActive,
        });
        onSaved(`Updated announcement “${title.trim()}”.`);
      } else {
        await createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          event_date: eventDate || null,
          badge: badge.trim() || null,
          is_active: isActive,
        });
        onSaved(`Posted new announcement “${title.trim()}”.`);
      }
    } catch (err) {
      setError(toMessage(err, "Could not save announcement."));
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={announcement ? "Edit Announcement" : "Post New Announcement"}
      description="Announcements appear on the school library homepage bulletin strip for students, teachers, and parents."
      onClose={onClose}
      busy={busy}
      wide
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error ? <InlineAlert>{error}</InlineAlert> : null}

        <TextField
          label="Headline / Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. National Reading Month Celebration"
          maxLength={200}
          autoFocus
        />

        <TextAreaField
          label="Details & Schedule"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the event, times, and activities taking place..."
          maxLength={2000}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Event Date (optional)"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <TextField
            label="Badge Tag (optional)"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="e.g. School Event, Storytelling, Book Drive"
            maxLength={50}
          />
        </div>

        <div className="rounded-xl border border-paper-300 bg-paper-100 p-3">
          <CheckboxField
            label="Show on public homepage bulletin (Active)"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {announcement ? "Save changes" : "Post Announcement"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
