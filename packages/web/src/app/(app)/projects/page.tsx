import { JiraProjectDashboard } from "@/components/dashboard/projects/jira-project-dashboard";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { requireAccess } from "@/lib/auth/access-context";
import { getJiraProjectData } from "@/lib/jira-data";
import { todayInSaoPaulo } from "@/services/my-day";
import { JIRA_PROJECTS, normalizeJiraProjectKey } from "@/services/jira-import";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const projectKey = normalizeJiraProjectKey((await searchParams).project);
  const [context, data] = await Promise.all([requireAccess("projects"), getJiraProjectData(projectKey)]);
  return <div>
    <PageTopbar title="Projetos" description="Execução dos projetos acompanhados pela AISphere" />
    <div className="p-6 sm:p-8">
      <JiraProjectDashboard
        project={data.project}
        issues={data.issues}
        batches={data.batches}
        canImport={context.role === "admin"}
        referenceDate={todayInSaoPaulo()}
        projects={JIRA_PROJECTS}
        selectedProjectKey={projectKey}
      />
    </div>
  </div>;
}
