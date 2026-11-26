import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { updateAlertStatus } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { label: "Critical", cls: "bg-red-50 text-red-700 border-red-200" },
  warning: { label: "Warning", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  info: { label: "Info", cls: "bg-aqua-50 text-aqua-700 border-aqua-200" },
};

const STATUS_CLS = {
  open: "bg-red-50 text-red-700",
  acknowledged: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Calcutta" }) : "—";

export function AlertTable({ alerts = [] }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ alert_id, status }) => updateAlertStatus({ data: { alert_id, status } }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(vars.status === "resolved" ? "Alert resolved" : "Alert acknowledged");
    },
    onError: (err) => toast.error(err?.message || "Could not update the alert"),
  });

  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-canvas/60 px-4 py-10 text-center">
        <CheckCheck className="mx-auto h-6 w-6 text-safe" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-marine">Nothing flagged here</p>
        <p className="mt-1 text-xs text-muted-foreground">Alerts appear the moment a reading leaves the safe band.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {alerts.map((alert) => {
        const sev = SEVERITY[alert.severity] ?? SEVERITY.info;
        return (
          <li key={alert.id} className="rounded-2xl border border-line/80 bg-white p-3.5 transition-colors hover:border-aqua-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("pill border", sev.cls)}>{sev.label}</span>
              <span className="pill bg-slate-100 capitalize text-slate-600">{alert.parameter || "system"}</span>
              <span className={cn("pill capitalize", STATUS_CLS[alert.status] ?? "bg-slate-100 text-slate-600")}>{alert.status || "open"}</span>
              {alert.email_sent && <span className="text-[10.5px] font-medium text-slate-500">email sent</span>}
              <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" /> {fmt(alert.created_date)}
              </span>
            </div>
            <p className="mt-2 text-[13px] font-medium leading-snug text-marine">{alert.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Device <span className="font-mono">{alert.device_id || "—"}</span>
              </span>
              {alert.status !== "acknowledged" && alert.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => mutation.mutate({ alert_id: alert.id, status: "acknowledged" })}
                  disabled={mutation.isPending}
                  className="ml-auto inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-line px-3 text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Acknowledge
                </button>
              )}
              {alert.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => mutation.mutate({ alert_id: alert.id, status: "resolved" })}
                  disabled={mutation.isPending}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Resolve
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
