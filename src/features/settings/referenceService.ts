import { supabase } from "@/lib/supabase";
import type { Category, GradeLevel, Section } from "@/types/domain";

// ---- categories -------------------------------------------------------------
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("id, name, is_active").order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}
export async function createCategory(name: string): Promise<void> {
  const { error } = await supabase.from("categories").insert({ name: name.trim() });
  if (error) throw error;
}
export async function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "is_active">>): Promise<void> {
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ---- grade levels -----------------------------------------------------------
export async function listGradeLevels(): Promise<GradeLevel[]> {
  const { data, error } = await supabase
    .from("grade_levels")
    .select("id, name, sort_order, is_active")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as GradeLevel[];
}
export async function createGradeLevel(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from("grade_levels").insert({ name: name.trim(), sort_order: sortOrder });
  if (error) throw error;
}
export async function updateGradeLevel(
  id: string,
  patch: Partial<Pick<GradeLevel, "name" | "sort_order" | "is_active">>,
): Promise<void> {
  const { error } = await supabase.from("grade_levels").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteGradeLevel(id: string): Promise<void> {
  const { error } = await supabase.from("grade_levels").delete().eq("id", id);
  if (error) throw error;
}

// ---- sections ---------------------------------------------------------------
export async function listSections(): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("id, grade_level_id, name, is_active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Section[];
}
export async function createSection(name: string, gradeLevelId: string | null): Promise<void> {
  const { error } = await supabase.from("sections").insert({ name: name.trim(), grade_level_id: gradeLevelId });
  if (error) throw error;
}
export async function updateSection(
  id: string,
  patch: Partial<Pick<Section, "name" | "grade_level_id" | "is_active">>,
): Promise<void> {
  const { error } = await supabase.from("sections").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw error;
}
