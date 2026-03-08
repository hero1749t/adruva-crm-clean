export type DateRange = "7d" | "30d" | "90d";

interface DateRangeToggleProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export function DateRangeToggle({ value, onChange }: DateRangeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
      {ranges.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
            value === r.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
