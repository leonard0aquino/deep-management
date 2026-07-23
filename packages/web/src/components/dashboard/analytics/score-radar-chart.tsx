"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { ScoreComponent } from "@/services/analytics";

export function ScoreRadarChart({ data }: { data: ScoreComponent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfil de Saúde da Carteira</CardTitle>
        <CardDescription>Média dos componentes do Health Score</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="component" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
