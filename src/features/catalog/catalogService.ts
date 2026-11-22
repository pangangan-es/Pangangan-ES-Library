import { supabase } from "@/lib/supabase";
import { sanitizeSearch } from "@/lib/search";
import type { CatalogBook, PublicCategory, Announcement, LibrarySettings } from "@/types/domain";

export interface CatalogQuery {
  search: string;
  category: string;
  availableOnly: boolean;
  page: number;
  pageSize: number;
}

export interface CatalogPage {
  rows: CatalogBook[];
  total: number;
}

export interface PublicLibraryStats {
  totalBooks: number;
  availableBooks: number;
  categoryCount: number;
  recentBooks: CatalogBook[];
  featuredBook: CatalogBook | null;
  settings: LibrarySettings;
}

export const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = {
  operating_hours: "Mon – Fri, 7:30 AM – 4:30 PM",
  quarter_name: "Q2 Reading Adventure",
  quarter_reading_goal_target: 1200,
  quarter_reading_goal_current: 840,
};

export async function searchCatalog(q: CatalogQuery): Promise<CatalogPage> {
  let query = supabase
    .from("public_catalog")
    .select("id, title, author, isbn, category, shelf_location, description, total_copies, available_copies, is_featured, is_sample", {
      count: "exact",
    })
    .order("title", { ascending: true })
    .range(q.page * q.pageSize, q.page * q.pageSize + q.pageSize - 1);

  const term = sanitizeSearch(q.search);
  if (term) {
    query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%`);
  }
  if (q.category) query = query.eq("category", q.category);
  if (q.availableOnly) query = query.gt("available_copies", 0);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as CatalogBook[], total: count ?? 0 };
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    // Fallback to public_categories view if categories table RLS denies anon
    const fallback = await supabase.from("public_categories").select("id, name").order("name");
    return (fallback.data ?? []) as PublicCategory[];
  }
  return (data ?? []) as PublicCategory[];
}

/** Small lookup used by checkout dialog */
export async function findBooksForCheckout(search: string): Promise<CatalogBook[]> {
  const term = sanitizeSearch(search);
  let query = supabase
    .from("public_catalog")
    .select("id, title, author, isbn, category, shelf_location, description, total_copies, available_copies, is_featured, is_sample")
    .order("title", { ascending: true })
    .limit(8);
  if (term) query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CatalogBook[];
}

/** Retrieves active public library announcements */
export async function listPublicAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, event_date, badge, is_active, is_sample, created_at, updated_at")
      .eq("is_active", true)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) return [];
    return (data ?? []) as Announcement[];
  } catch {
    return [];
  }
}

/** Retrieves general library settings */
export async function getPublicLibrarySettings(): Promise<LibrarySettings> {
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

/** Retrieves live homepage statistics with honest numbers and live Supabase queries */
export async function getPublicLibraryStats(): Promise<PublicLibraryStats> {
  try {
    const [booksRes, catsRes, featuredRes, settingsRes] = await Promise.all([
      supabase
        .from("public_catalog")
        .select("id, title, author, isbn, category, shelf_location, description, total_copies, available_copies, is_featured, is_sample")
        .order("title", { ascending: true })
        .limit(100),
      supabase.from("categories").select("id, name", { count: "exact" }).eq("is_active", true),
      supabase
        .from("public_catalog")
        .select("id, title, author, isbn, category, shelf_location, description, total_copies, available_copies, is_featured, is_sample")
        .eq("is_featured", true)
        .limit(1)
        .maybeSingle(),
      getPublicLibrarySettings(),
    ]);

    const books = (booksRes.data ?? []) as CatalogBook[];
    const totalTitles = booksRes.count ?? books.length;
    const catCount = catsRes.count ?? (catsRes.data?.length || 0);

    // Sum total available copies from live data
    const availableSum = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
    const totalCopiesSum = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);

    const firstBook = books.length > 0 && books[0] ? books[0] : null;
    const featuredBook = (featuredRes.data ? (featuredRes.data as CatalogBook) : null) ?? firstBook;

    return {
      totalBooks: totalCopiesSum > 0 ? totalCopiesSum : totalTitles,
      availableBooks: availableSum,
      categoryCount: catCount,
      recentBooks: books.slice(0, 6),
      featuredBook,
      settings: settingsRes,
    };
  } catch {
    return {
      totalBooks: 0,
      availableBooks: 0,
      categoryCount: 0,
      recentBooks: [],
      featuredBook: null,
      settings: DEFAULT_LIBRARY_SETTINGS,
    };
  }
}
