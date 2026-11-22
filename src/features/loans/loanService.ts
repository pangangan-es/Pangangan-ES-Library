import { supabase } from "@/lib/supabase";
import { sanitizeSearch } from "@/lib/search";
import type { CheckoutInput, LoanRow } from "@/types/domain";

export const LOAN_COLUMNS =
  "id, book_id, book_title, book_author, borrower_id, borrower_name, borrower_type, grade_level_name, section_name, quantity, borrowed_at, issued_by, issued_by_name, legacy_date_flag, returned_qty, outstanding_qty, status, last_returned_at, transactions";

export interface ActiveLoanQuery {
  search: string;
  page: number;
  pageSize: number;
}

export async function listActiveLoans(q: ActiveLoanQuery): Promise<{ rows: LoanRow[]; total: number }> {
  let query = supabase
    .from("loan_history")
    .select(LOAN_COLUMNS, { count: "exact" })
    .gt("outstanding_qty", 0)
    .order("borrowed_at", { ascending: false })
    .range(q.page * q.pageSize, q.page * q.pageSize + q.pageSize - 1);
  const term = sanitizeSearch(q.search);
  if (term) query = query.or(`book_title.ilike.%${term}%,borrower_name.ilike.%${term}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as LoanRow[], total: count ?? 0 };
}

/** Atomic server-side checkout: stock is locked and validated inside the database. */
export async function checkoutBook(input: CheckoutInput): Promise<void> {
  const { error } = await supabase.rpc("checkout_book", {
    p_book_id: input.bookId,
    p_quantity: input.quantity,
    p_borrower_name: input.borrowerName,
    p_borrower_type: input.borrowerType,
    p_grade_level_id: input.gradeLevelId,
    p_section_id: input.sectionId,
    p_borrower_id: input.borrowerId,
    p_remember: input.remember,
  });
  if (error) throw error;
}

/** Each call records one separate return transaction. */
export async function returnCopies(loanId: string, quantity: number): Promise<void> {
  const { error } = await supabase.rpc("return_copies", { p_loan_id: loanId, p_quantity: quantity });
  if (error) throw error;
}
