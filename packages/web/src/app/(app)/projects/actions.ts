"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzeJiraCsv, isSupportedJiraProject, JIRA_PROJECTS } from "@/services/jira-import";

export type JiraImportResult =
  | { ok: true; totalRows: number; insertedRows: number; updatedRows: number }
  | { ok: false; error: string };

export async function importJiraCsv(fileName: string, csv: string): Promise<JiraImportResult> {
  if (!fileName.toLocaleLowerCase("pt-BR").endsWith(".csv")) return { ok: false, error: "Selecione um arquivo CSV." };
  if (!csv || csv.length > 5_000_000) return { ok: false, error: "O arquivo deve ter até 5 MB." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "Apenas administradores podem importar dados do Jira." };

  const analysis = analyzeJiraCsv(csv);
  if (analysis.issues.length > 0 || analysis.rows.length === 0) {
    const first = analysis.issues[0];
    return { ok: false, error: first ? `Linha ${first.row}, ${first.field}: ${first.message}` : "O arquivo não contém cards válidos." };
  }
  if (!isSupportedJiraProject(analysis.projectKey)) {
    return { ok: false, error: `O projeto ${analysis.projectKey ?? "não identificado"} ainda não está habilitado para importação.` };
  }

  const { data, error } = await supabase.rpc("import_jira_issues", {
    p_project_key: analysis.projectKey,
    p_project_name: JIRA_PROJECTS[analysis.projectKey],
    p_file_name: fileName,
    p_rows: analysis.rows,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { total_rows: number; inserted_rows: number; updated_rows: number };
  revalidatePath("/projects");
  revalidatePath("/projects/tv");
  return { ok: true, totalRows: result.total_rows, insertedRows: result.inserted_rows, updatedRows: result.updated_rows };
}
