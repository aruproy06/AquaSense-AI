import { Link } from "@tanstack/react-router";
import { BatteryMedium, Cpu, Radio, RefreshCw, Signal, Timer } from "lucide-react";
import { BentoCard, CardHeading } from "@/components/water/BentoCard";
import { timeAgo } from "@/lib/water";
import { cn } from "@/lib/utils";

/** ESP32 connectivity dock: online state, battery, signal and last transmission. */
export function DeviceCard({ device, className, uploading = false }) {
  const online = device?.status === "online";
  return (
    <BentoCard className={cn("flex flex-col", className)}>
      <CardHeading
        icon={Cpu}
        title="ESP32 telemetry"
        hint={device?.location || "No device paired yet"}
        action={
          <span
            className={cn(
              "pill",
              online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", online ? "led bg-safe text-safe" : "bg-slate-400")} aria-hidden="true" />
            {online ? "Online" : "Offline"}
          </span>
        }
      />

      <div className="mt-4 rounded-2xl border border-line/80 bg-canvas/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Device</p>
        <p className="mt-0.5 font-display text-sm font-bold text-marine">{device?.name || "No device registered"}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{device?.device_id || "—"}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        {[
          { icon: BatteryMedium, label: "Battery", value: device?.battery != null ? `${device.battery}%` : "—" },
          { icon: Signal, label: "Signal", value: device?.signal != null ? `${device.signal} dBm` : "—" },
          { icon: Timer, label: "Interval", value: device?.sample_interval_seconds ? `${device.sample_interval_seconds}s` : "—" },
          { icon: Radio, label: "Last ping", value: timeAgo(device?.last_seen) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-line/70 bg-white px-3 py-2">
            <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3 w-3" aria-hidden="true" /> {label}
            </dt>
            <dd className="mt-0.5 text-[13px] font-bold text-marine">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto pt-3">
        <Link
          to="/uploads"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-marine px-4 text-sm font-semibold text-white transition-colors hover:bg-marine/90"
        >
          <RefreshCw className={cn("h-4 w-4", uploading && "animate-spin")} aria-hidden="true" />
          Ingest sensor data
        </Link>
        <p className="mt-2 text-center text-[10.5px] text-muted-foreground">Secure .csv / .xlsx / .xls upload · max 5 MB</p>
      </div>
    </BentoCard>
  );
}
