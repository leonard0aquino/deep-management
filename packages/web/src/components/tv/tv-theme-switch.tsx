import Link from "next/link";
import { Moon, Sun, type LucideIcon } from "lucide-react";

export type TvTheme = "dark" | "light";

export function normalizeTvTheme(value?: string | string[]): TvTheme {
  return value === "light" ? "light" : "dark";
}

export function TvThemeSwitch({ theme, basePath = "/tv" }: { theme: TvTheme; basePath?: string }) {
  const separator = basePath.includes("?") ? "&" : "?";
  const options: Array<{ value: TvTheme; label: string; href: string; icon: LucideIcon }> = [
    { value: "dark", label: "Tema escuro", href: basePath, icon: Moon },
    { value: "light", label: "Tema claro", href: `${basePath}${separator}theme=light`, icon: Sun },
  ];
  return (
    <nav
      aria-label="Escolher tema do Modo TV"
      className="flex rounded-lg border border-[var(--tv-border)] bg-[var(--tv-control)] p-1"
    >
      {options.map((option) => {
        const active = option.value === theme;
        const Icon = option.icon;

        return (
          <Link
            key={option.value}
            href={option.href}
            aria-label={option.label}
            aria-current={active ? "page" : undefined}
            title={option.label}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[var(--tv-muted)] hover:bg-[var(--tv-control-hover)] hover:text-[var(--tv-heading)]"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
