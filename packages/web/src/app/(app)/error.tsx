"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Falha ao renderizar área autenticada", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm" role="alert">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-base font-semibold">Não foi possível carregar esta área</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ocorreu uma falha inesperada. Seus dados não foram alterados e você pode tentar novamente.</p>
        <Button className="mt-5" onClick={reset}><RotateCcw aria-hidden="true" /> Tentar novamente</Button>
        {error.digest && <p className="mt-4 text-[10px] text-muted-foreground">Referência: {error.digest}</p>}
      </div>
    </main>
  );
}
