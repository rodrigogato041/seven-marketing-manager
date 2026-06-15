import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList, ReferenceArea,
} from "recharts";

export interface ChartLine {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
}

interface PremiumLineChartProps {
  data: Record<string, any>[];
  lines: ChartLine[];
  xDataKey: string;
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  height?: number;
  showStripes?: boolean;
  showDots?: boolean;
  showValues?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

function formatCurrencyShort(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return `R$${v}`;
}

function PremiumTooltip({
  active, payload, label, xFormatter, valueFormatter,
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border/60 rounded-lg shadow-lg p-4 text-sm min-w-[180px]">
      <p className="font-bold text-foreground mb-2 text-[13px] border-b border-border/30 pb-2">
        {xFormatter ? xFormatter(label) : label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}40` }}
              />
              <span className="text-muted-foreground text-xs">{entry.name}</span>
            </div>
            <span className="font-bold text-foreground text-xs tabular-nums">
              {valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PremiumLineChart({
  data,
  lines,
  xDataKey,
  xFormatter,
  yFormatter,
  tooltipValueFormatter,
  height = 340,
  showStripes = true,
  showDots = true,
  showValues = false,
  emptyMessage = "Nenhum dado disponível",
  emptyIcon,
}: PremiumLineChartProps) {
  // Generate alternating stripes for background
  const stripes = useMemo(() => {
    if (!showStripes || !data || data.length < 2) return [];
    return data
      .filter((_, i) => i % 2 === 0)
      .map((item) => item[xDataKey] as string);
  }, [data, showStripes, xDataKey]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
        {emptyIcon}
        <p className="text-sm font-medium mt-3">{emptyMessage}</p>
        <p className="text-xs mt-1 opacity-60">Os gráficos aparecerão quando houver dados registrados</p>
      </div>
    );
  }

  const defaultYFormatter = yFormatter || formatCurrencyShort;
  const defaultValueFormatter = tooltipValueFormatter || ((v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: showValues ? 34 : 20, right: 24, left: 10, bottom: 5 }}
        barCategoryGap="26%"
        barGap={8}
      >
        <defs>
          {lines.map((line) => (
            <linearGradient key={`grad-${line.dataKey}`} id={`bar-gradient-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={0.92} />
              <stop offset="100%" stopColor={line.color} stopOpacity={0.72} />
            </linearGradient>
          ))}
          <filter id="barShadow" x="-8%" y="-8%" width="116%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Alternating background stripes */}
        {stripes.map((xVal) => (
          <ReferenceArea
            key={`stripe-${xVal}`}
            x1={xVal}
            x2={xVal}
            fill="#f8f9fa"
            fillOpacity={0.6}
            strokeOpacity={0}
          />
        ))}

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          strokeOpacity={0.5}
          vertical={false}
        />

        <XAxis
          dataKey={xDataKey}
          tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
          tickFormatter={xFormatter}
          axisLine={{ stroke: "#e5e7eb", strokeWidth: 1 }}
          tickLine={false}
          dy={8}
        />

        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
          tickFormatter={(v) => defaultYFormatter(v)}
          axisLine={false}
          tickLine={false}
          dx={-5}
        />

        <Tooltip
          content={
            <PremiumTooltip
              xFormatter={xFormatter}
              valueFormatter={defaultValueFormatter}
            />
          }
          cursor={{
            fill: "#f1f5f9",
            opacity: 0.65,
          }}
        />

        <Legend
          verticalAlign="bottom"
          height={40}
          iconType="circle"
          iconSize={10}
          formatter={(value: string) => (
            <span className="text-xs font-medium text-muted-foreground ml-1.5">{value}</span>
          )}
        />

        {lines.map((line) => (
          <Bar
            key={line.dataKey}
            dataKey={line.dataKey}
            name={line.name}
            fill={`url(#bar-gradient-${line.dataKey})`}
            radius={[7, 7, 2, 2]}
            maxBarSize={46}
            filter={showDots ? "url(#barShadow)" : undefined}
          >
            {showValues && (
              <LabelList
                dataKey={line.dataKey}
                position="top"
                formatter={(value: number) => defaultValueFormatter(value)}
                className="fill-slate-600 text-[10px] font-semibold"
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
