import { JiraProjectDashboard } from "@/components/dashboard/projects/jira-project-dashboard";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { requireAccess } from "@/lib/auth/access-context";
import { getAllJiraProjectsData, getJiraProjectData } from "@/lib/jira-data";
import { todayInSaoPaulo } from "@/services/my-day";
import { JIRA_PROJECTS, normalizeJiraProjectSelection } from "@/services/jira-import";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const projectKey = normalizeJiraProjectSelection((await searchParams).project);
  const [context, projectData] = await Promise.all([
    requireAccess("projects"),
    projectKey === "ALL" ? getAllJiraProjectsData() : Promise.all([getJiraProjectData(projectKey)]),
  ]);
  const project = projectKey === "ALL" ? null : projectData[0]?.project ?? null;
  const issues = projectData.flatMap((data) => data.issues);
  const batches = projectData.flatMap((data) => data.batches).sort((a, b) => b.imported_at.localeCompare(a.imported_at));
  return <div>
    <PageTopbar title="Desenvolvimento" description="Execução das iniciativas de desenvolvimento acompanhadas pela AISphere" />
    <div className="p-6 sm:p-8">
      <JiraProjectDashboard
        project={project}
        issues={issues}
        batches={batches}
        canImport={context.role === "admin"}
        referenceDate={todayInSaoPaulo()}
        projects={JIRA_PROJECTS}
        selectedProjectKey={projectKey}
      />
    </div>
  </div>;
}
