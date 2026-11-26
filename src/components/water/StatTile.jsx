import { cn } from "@/lib/utils";

/** Compact metric tile used across analytics, devices and uploads. */
export function StatTile({ label, value, unit, hint, tone = "default", className }) {
  const tones = {
    default: "text-marine",
    safe: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    aqua: "text-aqua-600",
  };
  return (
    <div className={cn("rounded-2xl border border-line/80 bg-white px-3.5 py-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-extrabold leading-none", tones[tone])}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[10.5px] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}
