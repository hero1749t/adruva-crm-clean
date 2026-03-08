import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineMetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sparkData?: number[];
  sparkColor?: string;
  onClick?: () => void;
}

export function SparklineMetricCard({
  icon: Icon,
  label,
  value,
  color,
  sparkData,
  sparkColor = "hsl(217, 91%, 60%)",
  onClick,
}: SparklineMetricCardProps) {
  const chartData = sparkData?.map((v, i) => ({ v, i })) || [];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/30 ${onClick ? "cursor-pointer" : ""}`}
      style={{ animationDelay: `${Math.random() * 200}ms` }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="font-display text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {chartData.length > 1 && (
          <div className="h-10 w-20 opacity-60 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
