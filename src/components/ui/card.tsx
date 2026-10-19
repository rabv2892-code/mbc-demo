import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "cafe" | "eau" | "lipton" | "transport" | "success";
}) {
  const bar = {
    default: "bg-brand-600",
    cafe: "bg-cafe",
    eau: "bg-eau",
    lipton: "bg-lipton",
    transport: "bg-transport",
    success: "bg-emerald-600",
  }[tone];
  return (
    <Card className="overflow-hidden p-4">
      <div className={cn("mb-3 h-1 w-10 rounded-full", bar)} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
