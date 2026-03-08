import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";

const FUNNEL_COLORS = [
  "hsl(217, 91%, 60%)",  // new_lead - primary
  "hsl(199, 89%, 48%)",  // audit_booked - accent
  "hsl(38, 92%, 50%)",   // audit_done - warning
  "hsl(262, 83%, 58%)",  // in_progress - purple
  "hsl(160, 84%, 39%)",  // lead_won - success
  "hsl(0, 84%, 60%)",    // lead_lost - destructive
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(218, 49%, 13%)",
  border: "1px solid hsl(213, 50%, 24%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(214, 32%, 91%)",
};

interface FunnelData {
  name: string;
  value: number;
}

interface LeadConversionFunnelProps {
  data: FunnelData[];
}

export function LeadConversionFunnel({ data }: LeadConversionFunnelProps) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-primary">
        Lead Conversion Funnel
      </h2>
      {!hasData ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No lead data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(213,50%,24%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 25%, 53%)" }} allowDecimals={false} />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fontSize: 11, fill: "hsl(215, 25%, 53%)" }}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
