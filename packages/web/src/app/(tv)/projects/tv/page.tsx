import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JiraTvContent } from "@/components/tv/jira-tv-content";
import { TvHeaderClock } from "@/components/tv/tv-header-clock";
import { normalizeTvTheme, TvThemeSwitch } from "@/components/tv/tv-theme-switch";
import { requireAccess } from "@/lib/auth/access-context";
import { getJiraProjectData } from "@/lib/jira-data";
import { todayInSaoPaulo } from "@/services/my-day";
import { JIRA_PROJECTS, normalizeJiraProjectKey } from "@/services/jira-import";

export const metadata = { title: "DEEP — TV Desenvolvimento" };

export default async function ProjectsTvPage({ searchParams }: { searchParams: Promise<{ theme?: string | string[]; project?: string | string[] }> }) {
  const params = await searchParams;
  const theme = normalizeTvTheme(params.theme);
  const projectKey = normalizeJiraProjectKey(params.project);
  await requireAccess("projects");
  const data = await getJiraProjectData(projectKey);
  return <div className={`tv-theme tv-theme-${theme} min-h-screen bg-[var(--tv-bg)] p-7 text-[var(--tv-text)] lg:p-9`}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><div className="relative h-10 w-40"><Image src="/logo-deep-slogan.png" alt="DEEP" fill className="object-contain object-left" priority /></div><div><h1 className="text-2xl font-semibold text-[var(--tv-heading)] lg:text-3xl">TV de Desenvolvimento</h1><p className="text-xs uppercase tracking-[0.2em] text-[var(--tv-subtle)]">{JIRA_PROJECTS[projectKey]} · execução Jira</p></div></div>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Selecionar projeto" className="flex rounded-lg border border-[var(--tv-border)] bg-[var(--tv-control)] p-1">{Object.entries(JIRA_PROJECTS).map(([key, name]) => <Link key={key} title={name} aria-current={key === projectKey ? "page" : undefined} href={`/projects/tv?project=${key}${theme === "light" ? "&theme=light" : ""}`} className={`rounded-md px-2.5 py-2 text-xs ${key === projectKey ? "bg-blue-600 text-white" : "text-[var(--tv-muted)] hover:bg-[var(--tv-control-hover)]"}`}>{key}</Link>)}</nav>
        <TvThemeSwitch theme={theme} basePath={`/projects/tv?project=${projectKey}`} />
        <TvHeaderClock /><Link href={`/projects?project=${projectKey}`} className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-2 text-xs text-[var(--tv-subtle)] hover:text-[var(--tv-heading)]"><ArrowLeft className="h-3.5 w-3.5" /> Sair</Link>
      </div>
    </header>
    <JiraTvContent issues={data.issues} lastImportedAt={data.batches[0]?.imported_at ?? null} referenceDate={todayInSaoPaulo()} />
  </div>;
}
