import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, Mail, ShieldAlert } from "lucide-react";
import { BentoCard } from "@/components/water/BentoCard";
import { AlertTable } from "@/components/water/AlertTable";
import { StatTile } from "@/components/water/StatTile";
import { useAlerts } from "@/lib/use-aquasense";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/alerts")({
  head: () => ({ meta: [{ title: "Alert history · AquaSense AI" }] }),
  component: AlertsPage,
});

const FILTERS = ["all", "open", "acknowledged", "resolved"];

function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts(100);
  const [filter, setFilter] = useState("all");

  const counts = useMemo(
    () => ({
      open: alerts.filter((a) => (a.status || "open") === "open").length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warned: alerts.filter((a) => a.severity === "warning").length,
      emailed: alerts.filter((a) => a.email_sent).length,
    }),
    [alerts],
  );

  const shown = filter === "all" ? alerts : alerts.filter((a) => (a.status || "open") === filter);

  return (
    <div className="space-y-4">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-aqua-600">
          <BellRing className="h-3.5 w-3.5" aria-hidden="true" /> Detection engine
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[28px]">Alert history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every contamination event and abnormal pattern the system has flagged, with its email delivery state.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open alerts" value={counts.open} tone={counts.open ? "danger" : "safe"} hint="Awaiting acknowledgement" />
        <StatTile label="Critical" value={counts.critical} tone="danger" hint="Contaminated readings" />
        <StatTile label="Warnings" value={counts.warned} tone="warning" hint="Outside the safe band" />
        <StatTile label="Emails sent" value={counts.emailed} tone="aqua" hint="Owner notified" />
      </div>

      <BentoCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-canvas p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "min-h-[34px] rounded-lg px-3 text-[11.5px] font-semibold capitalize transition-colors",
                  filter === f ? "bg-white text-marine shadow-sm" : "text-slate-500 hover:text-marine",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email notifications are sent to your account address
          </p>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <AlertTable alerts={shown} />
          )}
        </div>
      </BentoCard>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldAlert, title: "Threshold flags", text: "Any parameter outside the BIS/WHO acceptable band raises an alert instantly." },
          { icon: AlertTriangle, title: "Pattern detection", text: "Z-score deviation from the trailing 24-reading baseline catches drift before a limit is crossed." },
          { icon: Mail, title: "Email delivery", text: "Live and imported anomalies both notify the device owner's registered address." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-line/80 bg-white/70 p-3.5">
            <Icon className="h-4 w-4 text-aqua-600" aria-hidden="true" />
            <p className="mt-2 text-[12.5px] font-bold text-marine">{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
