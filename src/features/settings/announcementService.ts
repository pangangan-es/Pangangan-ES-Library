import { supabase } from "@/lib/supabase";
import type { Announcement, AnnouncementInput, LibrarySettings } from "@/types/domain";

export const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = {
  operating_hours: "Mon – Fri, 7:30 AM – 4:30 PM",
  quarter_name: "Q2 Reading Adventure",
  quarter_reading_goal_target: 1200,
  quarter_reading_goal_current: 840,
};

export async function listStaffAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, content, event_date, badge, is_active, is_sample, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    // If table doesn't exist yet, return empty
    return [];
  }
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  const { error } = await supabase.from("announcements").insert({
    title: input.title.trim(),
    content: input.content.trim(),
    event_date: input.event_date || null,
    badge: input.badge ? input.badge.trim() : null,
    is_active: input.is_active,
    is_sample: false,
  });
  if (error) throw error;
}

export async function updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (patch.title !== undefined) updateData.title = patch.title.trim();
  if (patch.content !== undefined) updateData.content = patch.content.trim();
  if (patch.event_date !== undefined) updateData.event_date = patch.event_date || null;
  if (patch.badge !== undefined) updateData.badge = patch.badge ? patch.badge.trim() : null;
  if (patch.is_active !== undefined) updateData.is_active = patch.is_active;

  const { error } = await supabase.from("announcements").update(updateData).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

export async function getLibrarySettings(): Promise<LibrarySettings> {
  try {
    const { data, error } = await supabase
      .from("library_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle();

    if (error || !data) return DEFAULT_LIBRARY_SETTINGS;
    return { ...DEFAULT_LIBRARY_SETTINGS, ...(data.value as Partial<LibrarySettings>) };
  } catch {
    return DEFAULT_LIBRARY_SETTINGS;
  }
}

export async function updateLibrarySettings(settings: Partial<LibrarySettings>): Promise<void> {
  const current = await getLibrarySettings();
  const next = { ...current, ...settings };

  const { error } = await supabase.from("library_settings").upsert({
    key: "general",
    value: next,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
