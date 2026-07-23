"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const NONE = "__none__";

export function ReportsToSelect({
  contactId,
  currentValue,
  options,
  personName,
}: {
  contactId: string;
  currentValue: string | null;
  options: { id: string; name: string }[];
  personName?: string;
}) {
  const router = useRouter();

  async function handleChange(value: string | null) {
    const supabase = createClient();
    const reportsTo = value === NONE || !value ? null : value;
    const { error } = await supabase
      .from("client_contacts")
      .update({ reports_to_contact_id: reportsTo })
      .eq("id", contactId);
    if (!error) router.refresh();
  }

  return (
    <Select value={currentValue ?? NONE} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-40 text-xs" aria-label={`Hierarquia de ${personName ?? "pessoa"}`}>
        <SelectValue placeholder="Reporta para...">
          {(v: string | null) =>
            v && v !== NONE ? (options.find((o) => o.id === v)?.name ?? "—") : "Sem hierarquia"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sem hierarquia</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
