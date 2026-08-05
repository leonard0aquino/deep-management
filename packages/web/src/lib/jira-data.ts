import { createClient } from "@/lib/supabase/server";
import type { JiraImportBatch, JiraIssue, JiraProject } from "@/lib/types/database";

export async function getJiraProjectData(projectKey = "SIN") {
  const supabase = await createClient();
  const projectResult = await supabase.from("jira_projects").select("*").eq("project_key", projectKey).maybeSingle<JiraProject>();
  if (projectResult.error) throw new Error(`Não foi possível carregar o projeto Jira: ${projectResult.error.message}`);
  if (!projectResult.data) return { project: null, issues: [] as JiraIssue[], batches: [] as JiraImportBatch[] };

  const [issuesResult, batchesResult] = await Promise.all([
    supabase.from("jira_issues").select("*").eq("project_id", projectResult.data.id).eq("active", true).order("source_updated_at", { ascending: false }).returns<JiraIssue[]>(),
    supabase.from("jira_import_batches").select("*").eq("project_id", projectResult.data.id).order("imported_at", { ascending: false }).limit(10).returns<JiraImportBatch[]>(),
  ]);
  const error = issuesResult.error ?? batchesResult.error;
  if (error) throw new Error(`Não foi possível carregar os dados do Jira: ${error.message}`);
  return { project: projectResult.data, issues: issuesResult.data ?? [], batches: batchesResult.data ?? [] };
}
