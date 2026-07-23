import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, TrendingUp } from "lucide-react";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ProductRevenue({
  protectedRevenue,
  potentialRevenue,
}: {
  protectedRevenue: number;
  potentialRevenue: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Receita Protegida
          </CardTitle>
          <CardDescription>Contratos ativos dos clientes que usam este produto</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(protectedRevenue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-blue-700">
            <TrendingUp className="h-4 w-4" />
            Receita Potencial
          </CardTitle>
          <CardDescription>Contratos de clientes identificados como oportunidade</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(potentialRevenue)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
