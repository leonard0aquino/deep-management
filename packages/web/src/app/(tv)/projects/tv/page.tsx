import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JiraTvContent } from "@/components/tv/jira-tv-content";
import { TvHeaderClock } from "@/components/tv/tv-header-clock";
import { normalizeTvTheme, TvThemeSwitch } from "@/components/tv/tv-theme-switch";
import { requireAccess } from "@/lib/auth/access-context";
import { getAllJiraProjectsData, getJiraProjectData } from "@/lib/jira-data";
import { todayInSaoPaulo } from "@/services/my-day";
import { isSupportedJiraProject, JIRA_PROJECTS, type JiraProjectKey } from "@/services/jira-import";

export const metadata = { title: "DEEP — TV Desenvolvimento" };

const TV_PERIODS = { all: "Todo período", "7": "7 dias", "14": "14 dias", "21": "21 dias" } as const;
type TvPeriod = keyof typeof TV_PERIODS;
type TvProject = "ALL" | JiraProjectKey;

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeProject(value?: string | string[]): TvProject {
  const candidate = first(value)?.toUpperCase() ?? "ALL";
  return candidate === "ALL" || isSupportedJiraProject(candidate) ? candidate : "ALL";
}

function normalizePeriod(value?: string | string[]): TvPeriod {
  const candidate = first(value) ?? "all";
  return candidate in TV_PERIODS ? candidate as TvPeriod : "all";
}

function tvHref(project: TvProject, period: TvPeriod, theme: "dark" | "light") {
  const params = new URLSearchParams({ project, period });
  if (theme === "light") params.set("theme", "light");
  return `/projects/tv?${params.toString()}`;
}

export default async function ProjectsTvPage({ searchParams }: { searchParams: Promise<{ theme?: string | string[]; project?: string | string[]; period?: string | string[] }> }) {
  const params = await searchParams;
  const theme = normalizeTvTheme(params.theme);
  const projectKey = normalizeProject(params.project);
  const period = normalizePeriod(params.period);
  await requireAccess("projects");
  const data = projectKey === "ALL" ? await getAllJiraProjectsData() : [await getJiraProjectData(projectKey)];
  const issues = data.flatMap((project) => project.issues);
  const importedDates = data.flatMap((project) => project.batches[0]?.imported_at ? [project.batches[0].imported_at] : []);
  const lastImportedAt = importedDates.sort((a, b) => b.localeCompare(a))[0] ?? null;
  const projectName = projectKey === "ALL" ? "Visão Geral" : JIRA_PROJECTS[projectKey];
  return <div className={`tv-theme tv-theme-${theme} min-h-screen bg-[var(--tv-bg)] p-7 text-[var(--tv-text)] lg:p-9`}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><div className="relative h-10 w-40"><Image src="/logo-deep-slogan.png" alt="DEEP" fill className="object-contain object-left" priority /></div><div><h1 className="text-2xl font-semibold text-[var(--tv-heading)] lg:text-3xl">TV de Desenvolvimento</h1><p className="text-xs uppercase tracking-[0.2em] text-[var(--tv-subtle)]">{projectName} · execução Jira</p></div></div>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Selecionar projeto" className="flex rounded-lg border border-[var(--tv-border)] bg-[var(--tv-control)] p-1">{([['ALL', 'Geral'], ...Object.entries(JIRA_PROJECTS)] as Array<[TvProject, string]>).map(([key, name]) => <Link key={key} title={name} aria-current={key === projectKey ? "page" : undefined} href={tvHref(key, period, theme)} className={`rounded-md px-2.5 py-2 text-xs ${key === projectKey ? "bg-blue-600 text-white" : "text-[var(--tv-muted)] hover:bg-[var(--tv-control-hover)]"}`}>{key === "ALL" ? "Geral" : key}</Link>)}</nav>
        <nav aria-label="Selecionar período" className="flex rounded-lg border border-[var(--tv-border)] bg-[var(--tv-control)] p-1">{Object.entries(TV_PERIODS).map(([value, label]) => <Link key={value} aria-current={value === period ? "page" : undefined} href={tvHref(projectKey, value as TvPeriod, theme)} className={`rounded-md px-2.5 py-2 text-xs ${value === period ? "bg-violet-600 text-white" : "text-[var(--tv-muted)] hover:bg-[var(--tv-control-hover)]"}`}>{label}</Link>)}</nav>
        <TvThemeSwitch theme={theme} basePath={`/projects/tv?project=${projectKey}&period=${period}`} />
        <TvHeaderClock /><Link href={projectKey === "ALL" ? "/projects" : `/projects?project=${projectKey}`} className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-2 text-xs text-[var(--tv-subtle)] hover:text-[var(--tv-heading)]"><ArrowLeft className="h-3.5 w-3.5" /> Sair</Link>
      </div>
    </header>
    <JiraTvContent issues={issues} lastImportedAt={lastImportedAt} referenceDate={todayInSaoPaulo()} period={period} />
  </div>;
}
