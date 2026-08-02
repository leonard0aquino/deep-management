"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";

const CREATE_SENTINEL = "__create_new__";

export function CreatableSelect({
  ariaLabel,
  items,
  value,
  onValueChange,
  onCreate,
  placeholder = "Selecione",
  createLabel = "Adicionar novo",
  disabled = false,
  allowCreate = true,
}: {
  ariaLabel?: string;
  items: { id: string; name: string }[];
  value: string;
  onValueChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ id: string; name: string } | null>;
  placeholder?: string;
  createLabel?: string;
  disabled?: boolean;
  allowCreate?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    setError(null);
    const created = await onCreate(name);
    setSaving(false);

    if (!created) {
      setError("Não foi possível criar.");
      return;
    }

    onValueChange(created.id);
    setCreating(false);
    setNewName("");
  }

  function handleCancel() {
    setCreating(false);
    setNewName("");
    setError(null);
  }

  if (creating) {
    return (
      <div className="space-y-1">
        <div className="flex gap-1.5">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === "Escape") handleCancel();
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="default"
            disabled={saving || !newName.trim()}
            onClick={handleCreate}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === CREATE_SENTINEL) {
          setCreating(true);
          return;
        }
        onValueChange(v ?? "");
      }}
      disabled={disabled}
    >
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder}>
          {(v: string | null) => items.find((item) => item.id === v)?.name ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
        {allowCreate && (
          <>
            <SelectSeparator />
            <SelectItem value={CREATE_SENTINEL}>
              <span className="flex items-center gap-1.5 text-blue-600">
                <Plus className="h-3.5 w-3.5" />
                {createLabel}
              </span>
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
