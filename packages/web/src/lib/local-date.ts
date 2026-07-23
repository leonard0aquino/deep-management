const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseLocalDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatLocalDateGroup(value: string, now = new Date()): string {
  const date = parseLocalDate(value);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);

  if (sameLocalDay(date, now)) return "Hoje";
  if (sameLocalDay(date, yesterday)) return "Ontem";

  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}
