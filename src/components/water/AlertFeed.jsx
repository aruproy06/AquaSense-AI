import { Link } from "@tanstack/react-router";
import { AlertTriangle, BellRing, CheckCircle2, ChevronRight, ShieldAlert } from "lucide-react";
import { BentoCard, CardHeading } from "@/components/water/BentoCard";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { icon: ShieldAlert, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-danger" },
  warning: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-warn" },
  info: { icon: BellRing, cls: "bg-aqua-50 text-aqua-700 border-aqua-200", dot: "bg-aqua-500" },
};

function when(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Calcutta" });
}

export function AlertFeed({ alerts = [], className, limit = 5, showHeader = true }) {
  const shown = alerts.slice(0, limit);
  return (
    <BentoCard className={cn("flex flex-col", className)}>
      {showHeader && (
        <CardHeading
          icon={BellRing}
          title="Contamination & anomaly log"
          hint="Flags raised by the detection engine"
          action={
            <Link to="/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-aqua-600 hover:underline">
              All alerts <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      )}

      {shown.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 px-4 py-10 text-center">
          <CheckCircle2 className="h-7 w-7 text-safe" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-marine">No anomalies detected</p>
          <p className="mt-1 text-xs text-muted-foreground">Every reading in the current window sits inside the safe envelope.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {shown.map((alert) => {
            const sev = SEVERITY[alert.severity] ?? SEVERITY.info;
            const Icon = sev.icon;
            return (
              <li key={alert.id} className="flex gap-3 rounded-2xl border border-line/80 bg-white p-3 transition-colors hover:border-aqua-200">
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", sev.cls)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-marine">{alert.message}</p>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="capitalize">{alert.parameter || "system"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{when(alert.created_date)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{alert.status || "open"}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
