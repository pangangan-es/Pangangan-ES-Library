export type Role = "admin" | "librarian" | "teacher";
export type BorrowerType = "student" | "teacher" | "other";
export type LoanStatus = "out" | "partial" | "returned";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  librarian: "Librarian",
  teacher: "Teacher",
};

export const BORROWER_TYPE_LABELS: Record<BorrowerType, string> = {
  student: "Student",
  teacher: "Teacher",
  other: "Other",
};

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
}

/** Row of the public_catalog view: the only book data anonymous visitors can read. */
export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  shelf_location: string | null;
  description: string | null;
  total_copies: number;
  available_copies: number;
  is_featured?: boolean;
  is_sample?: boolean;
  cover_url?: string | null;
  created_at?: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  book_count?: number;
}

/** Row of the admin-only book_inventory view. */
export interface InventoryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category_id: string | null;
  category_name: string | null;
  shelf_location: string | null;
  description: string | null;
  total_copies: number;
  is_archived: boolean;
  on_loan: number;
  has_history: boolean;
  is_featured?: boolean;
  is_sample?: boolean;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title: string;
  author: string;
  isbn: string | null;
  category_id: string | null;
  shelf_location: string | null;
  description: string | null;
  total_copies: number;
  is_featured?: boolean;
  is_sample?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  event_date: string | null;
  badge: string | null;
  is_active: boolean;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  event_date: string | null;
  badge: string | null;
  is_active: boolean;
}

export interface LibrarySettings {
  operating_hours: string;
  quarter_name: string;
  quarter_reading_goal_target: number;
  quarter_reading_goal_current: number;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

export interface GradeLevel {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Section {
  id: string;
  grade_level_id: string | null;
  name: string;
  is_active: boolean;
}

export interface Borrower {
  id: string;
  full_name: string;
  borrower_type: BorrowerType;
  grade_level_id: string | null;
  section_id: string | null;
  is_active: boolean;
}

export interface ReturnTransaction {
  id: string;
  quantity: number;
  returned_at: string;
  received_by: string;
  received_by_name: string;
}

export interface LoanRow {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  borrower_id: string | null;
  borrower_name: string;
  borrower_type: BorrowerType;
  grade_level_name: string | null;
  section_name: string | null;
  quantity: number;
  borrowed_at: string;
  issued_by: string;
  issued_by_name: string;
  legacy_date_flag: string | null;
  returned_qty: number;
  outstanding_qty: number;
  status: LoanStatus;
  last_returned_at: string | null;
  transactions: ReturnTransaction[];
}

export interface StaffDirectoryEntry {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface DashboardStats {
  titles: number;
  total_copies: number;
  copies_on_loan: number;
  open_loans: number;
  loans_today: number;
  returns_today: number;
  top_books: { title: string; copies: number }[];
  top_borrowers: { name: string; loans: number }[];
}

export interface CheckoutInput {
  bookId: string;
  quantity: number;
  borrowerName: string;
  borrowerType: BorrowerType;
  gradeLevelId: string | null;
  sectionId: string | null;
  borrowerId: string | null;
  remember: boolean;
}
