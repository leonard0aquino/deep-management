import { createClient } from "@/lib/supabase/server";
import type { JiraImportBatch, JiraIssue, JiraProject } from "@/lib/types/database";
import { JIRA_PROJECTS } from "@/services/jira-import";

export async function getJiraProjectData(projectKey = "SIN") {
  const supabase = await createClient();
  const projectResult = await supabase.from("jira_projects").select("*").eq("project_key", projectKey).maybeSingle<JiraProject>();
  if (projectResult.error) throw new Error(`Não foi possível carregar o projeto Jira: ${projectResult.error.message}`);
  if (!projectResult.data) return { project: null, issues: [] as JiraIssue[], batches: [] as JiraImportBatch[] };
  const project = projectResult.data;

  const [issues, batchesResult] = await Promise.all([
    (async () => {
      const rows: JiraIssue[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const result = await supabase.from("jira_issues").select("*").eq("project_id", project.id).eq("active", true).order("source_updated_at", { ascending: false }).range(from, from + pageSize - 1).returns<JiraIssue[]>();
        if (result.error) throw new Error(`Não foi possível carregar os cards do Jira: ${result.error.message}`);
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < pageSize) return rows;
      }
    })(),
    supabase.from("jira_import_batches").select("*").eq("project_id", project.id).order("imported_at", { ascending: false }).limit(10).returns<JiraImportBatch[]>(),
  ]);
  if (batchesResult.error) throw new Error(`Não foi possível carregar os lotes do Jira: ${batchesResult.error.message}`);
  return { project, issues, batches: batchesResult.data ?? [] };
}

export async function getAllJiraProjectsData() {
  return Promise.all(Object.keys(JIRA_PROJECTS).map((projectKey) => getJiraProjectData(projectKey)));
}
