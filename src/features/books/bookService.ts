import { supabase } from "@/lib/supabase";
import { sanitizeSearch } from "@/lib/search";
import type { BookInput, InventoryBook } from "@/types/domain";

const INVENTORY_COLUMNS =
  "id, title, author, isbn, category_id, category_name, shelf_location, description, total_copies, is_archived, on_loan, has_history, is_featured, is_sample, created_at, updated_at";

export async function listInventory(search: string, showArchived: boolean): Promise<InventoryBook[]> {
  let query = supabase.from("book_inventory").select(INVENTORY_COLUMNS).order("title", { ascending: true }).limit(500);
  const term = sanitizeSearch(search);
  if (term) query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%`);
  if (!showArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InventoryBook[];
}

export async function createBook(input: BookInput): Promise<void> {
  const { error } = await supabase.from("books").insert({
    ...input,
    is_featured: input.is_featured ?? false,
    is_sample: input.is_sample ?? false,
  });
  if (error) throw error;
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  const { error } = await supabase.from("books").update({
    ...input,
    is_featured: input.is_featured ?? false,
    is_sample: input.is_sample ?? false,
  }).eq("id", id);
  if (error) throw error;
}

export async function toggleFeaturedBook(id: string, isFeatured: boolean): Promise<void> {
  if (isFeatured) {
    // Unset any previous featured book first
    await supabase.from("books").update({ is_featured: false }).neq("id", id);
  }
  const { error } = await supabase.from("books").update({ is_featured: isFeatured }).eq("id", id);
  if (error) throw error;
}

export async function setBookArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from("books").update({ is_archived: archived }).eq("id", id);
  if (error) throw error;
}

/** Only succeeds for books that never had a loan; the database refuses otherwise. */
export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

/** Check if any sample data exists in the books table */
export async function checkHasSampleBooks(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("is_sample", true);
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Clear all sample demo books & announcements from database */
export async function clearAllSampleData(): Promise<number> {
  // First attempt via the safe RPC
  const { data, error } = await supabase.rpc("clear_all_sample_data");
  if (!error) return Number(data ?? 0);

  // Fallback direct cleanup for staff if RPC is pending migration run
  try {
    await supabase.from("announcements").delete().eq("is_sample", true);
  } catch {
    // Announcements table might not exist yet if script hasn't run
  }

  const { data: sampleBooks, error: fetchErr } = await supabase
    .from("books")
    .select("id")
    .eq("is_sample", true);

  if (fetchErr || !sampleBooks || sampleBooks.length === 0) return 0;

  const ids = sampleBooks.map((b) => b.id);
  const { error: delErr } = await supabase.from("books").delete().in("id", ids);
  if (delErr) throw delErr;
  return ids.length;
}
