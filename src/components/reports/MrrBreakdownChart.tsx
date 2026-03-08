import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const COLORS = {
  success: "hsl(160, 84%, 39%)",
  muted: "hsl(215, 25%, 53%)",
};

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(218, 49%, 13%)",
  border: "1px solid hsl(213, 50%, 24%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(214, 32%, 91%)",
};

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface MrrData {
  label: string;
  mrr: number;
  clients: number;
}

interface MrrBreakdownChartProps {
  data: MrrData[];
}

export function MrrBreakdownChart({ data }: MrrBreakdownChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-primary">
        Monthly Recurring Revenue (MRR)
      </h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No MRR data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(213,50%,24%)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.muted }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: COLORS.muted }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: COLORS.muted }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) =>
                name === "MRR" ? fmtINR(value) : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="mrr"
              name="MRR"
              stroke={COLORS.success}
              fillOpacity={1}
              fill="url(#gradMrr)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="clients"
              name="Active Clients"
              stroke="hsl(199, 89%, 48%)"
              fillOpacity={0}
              strokeDasharray="5 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
