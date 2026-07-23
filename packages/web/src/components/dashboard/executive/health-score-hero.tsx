"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { scoreLabel, scoreToneClass } from "@/lib/status";
import type { ScoreTrendPoint } from "@/services/health-score";

export function HealthScoreHero({
  score,
  trend,
  criticalCount,
  targetScore,
}: {
  score: number;
  trend: ScoreTrendPoint[];
  criticalCount: number;
  targetScore: number;
}) {
  const label = scoreLabel(score);
  const tone = scoreToneClass(score);
  const first = trend[0]?.score ?? score;
  const delta = score - first;
  const targetDelta = score - targetScore;

  return (
    <Card className="min-h-[390px] rounded-xl shadow-none ring-black/[0.08]">
      <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
        <div>
          <CardTitle className="text-[13px]">Evolução do Health Score</CardTitle>
          <CardDescription className="text-[11px]">Tendência baseada nas interações recentes</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Score atual</p>
          <p className={`text-lg font-semibold tabular-nums ${tone}`}>{score} · {label}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
              <Tooltip formatter={(value) => [`${value}`, "Score"]} labelFormatter={(value) => value} />
              <ReferenceLine y={targetScore} stroke="#10b981" strokeDasharray="5 4" label={{ value: `Meta ${targetScore}`, position: "insideTopRight", fontSize: 10, fill: "#059669" }} />
              <Line type="monotone" dataKey="score" stroke="#18181b" strokeWidth={2.5} dot={{ r: 3, fill: "#18181b" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 border-t pt-4">
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            {criticalCount === 0
              ? "Nenhuma combinação crítica na carteira."
              : `${criticalCount} combinação${criticalCount === 1 ? "" : "ões"} crítica${
                  criticalCount === 1 ? "" : "s"
                } precisam de atenção imediata.`}
            {trend.length > 1 && (
              <span className={delta >= 0 ? " text-emerald-600" : " text-red-600"}>
                {" "}
                {delta >= 0 ? "↗" : "↘"} {Math.abs(delta)} pts em {trend.length} semanas
              </span>
            )}
          </p>
          <span className={`shrink-0 text-[11px] font-medium ${targetDelta >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {targetDelta >= 0 ? "+" : ""}{targetDelta} pts vs. meta {targetScore}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
