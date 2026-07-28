"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return <Button type="button" variant="outline" onClick={() => window.print()}><Printer aria-hidden="true" />Imprimir / salvar PDF</Button>;
}
