import { supabase } from "@/lib/supabase";
import { LOAN_COLUMNS } from "@/features/loans/loanService";
import type { DashboardStats, LoanRow } from "@/types/domain";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw error;
  return data as DashboardStats;
}

export async function fetchRecentLoans(limit = 6): Promise<LoanRow[]> {
  const { data, error } = await supabase
    .from("loan_history")
    .select(LOAN_COLUMNS)
    .order("borrowed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LoanRow[];
}
