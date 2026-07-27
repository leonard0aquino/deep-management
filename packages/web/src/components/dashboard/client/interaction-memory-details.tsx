import { Badge } from "@/components/ui/badge";
import { parseLocalDate } from "@/lib/local-date";
import type { CustomerSentiment, InteractionView } from "@/lib/types/database";

const SENTIMENT_LABEL: Record<CustomerSentiment, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
};

function MemorySection({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-foreground/80">{value}</p>
    </div>
  );
}

function formatDueDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InteractionMemoryDetails({ interaction }: { interaction: InteractionView }) {
  const participants = interaction.additional_participants ?? [];
  const hasMemory = Boolean(
    interaction.notes ||
      interaction.decisions ||
      interaction.customer_sentiment ||
      interaction.risks ||
      interaction.opportunities ||
      interaction.next_step ||
      participants.length ||
      interaction.confidential,
  );

  if (!hasMemory) return null;

  return (
    <div className="mt-3 space-y-3 rounded-lg border bg-background/70 p-3">
      <div className="flex flex-wrap gap-2">
        {interaction.customer_sentiment && (
          <Badge variant="outline">Sentimento: {SENTIMENT_LABEL[interaction.customer_sentiment]}</Badge>
        )}
        {interaction.confidential && <Badge variant="destructive">Confidencial</Badge>}
      </div>

      <MemorySection label="Resumo e notas" value={interaction.notes} />
      <MemorySection label="Decisões" value={interaction.decisions} />

      <div className="grid gap-3 sm:grid-cols-2">
        <MemorySection label="Riscos" value={interaction.risks} />
        <MemorySection label="Oportunidades" value={interaction.opportunities} />
      </div>

      {participants.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Participantes adicionais
          </p>
          <p className="text-sm text-foreground/80">{participants.join(", ")}</p>
        </div>
      )}

      {interaction.next_step && (
        <div className="rounded-md border-l-2 border-blue-500 bg-blue-50/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Próximo passo</p>
          <p className="text-sm text-slate-800">{interaction.next_step}</p>
          {(interaction.next_step_owner || interaction.next_step_due_date) && (
            <p className="mt-1 text-xs text-slate-600">
              {interaction.next_step_owner && `Responsável: ${interaction.next_step_owner}`}
              {interaction.next_step_owner && interaction.next_step_due_date && " · "}
              {interaction.next_step_due_date && `Prazo: ${formatDueDate(interaction.next_step_due_date)}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
