import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceArea,
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
    <div className="bg-white/95 backdrop-blur-sm border border-border/60 rounded-xl shadow-2xl p-4 text-sm min-w-[180px]">
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

function CustomDot({ cx, cy, value, stroke, showValues, valueFormatter }: any) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      {/* Outer glow */}
      <circle cx={cx} cy={cy} r={8} fill={stroke} opacity={0.1} />
      {/* White border */}
      <circle cx={cx} cy={cy} r={5} fill="white" stroke={stroke} strokeWidth={2.5} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={2} fill={stroke} />
      {/* Value label */}
      {showValues && value != null && (
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill={stroke}
          fontSize={10}
          fontWeight={700}
          style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
        >
          {valueFormatter ? valueFormatter(value) : value?.toLocaleString("pt-BR")}
        </text>
      )}
    </g>
  );
}

function CustomActiveDot({ cx, cy, stroke }: any) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill={stroke} opacity={0.08}>
        <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.15;0.08" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={6} fill="white" stroke={stroke} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={2.5} fill={stroke} />
    </g>
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
      <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={`grad-${line.dataKey}`} id={`gradient-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={line.color} stopOpacity={0.01} />
            </linearGradient>
          ))}
          {/* Drop shadow for lines */}
          <filter id="lineShadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
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
            stroke: "#d1d5db",
            strokeWidth: 1,
            strokeDasharray: "4 4",
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
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={line.strokeWidth || 3}
            strokeDasharray={line.dashed ? "8 4" : undefined}
            filter="url(#lineShadow)"
            dot={showDots ? (props: any) => {
              const { key, ...rest } = props;
              return (
                <CustomDot
                  key={key}
                  {...rest}
                  showValues={showValues}
                  valueFormatter={defaultValueFormatter}
                />
              );
            } : false}
            activeDot={(props: any) => {
              const { key, ...rest } = props;
              return <CustomActiveDot key={key} {...rest} />;
            }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
