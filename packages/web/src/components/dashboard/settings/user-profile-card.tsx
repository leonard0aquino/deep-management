"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function UserProfileCard({ email }: { email: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { error: dbError } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setSaved(true);
    setNewPassword("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Nova senha</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Senha atualizada com sucesso.</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleChangePassword} disabled={saving || !newPassword}>
          {saving ? "Salvando..." : "Alterar senha"}
        </Button>
      </CardFooter>
    </Card>
  );
}
