import { STATUS, formatValue } from "@/lib/water";
import { cn } from "@/lib/utils";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Calcutta" }) : "—";

/** Recent readings table — the wide part scrolls inside its own container. */
export function ReadingTable({ readings = [], className, limit = 20 }) {
  if (!readings.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-canvas/60 px-4 py-8 text-center text-xs text-muted-foreground">
        No readings stored yet. Import a sensor file to populate the history.
      </div>
    );
  }

  return (
    <div className={cn("-mx-1 overflow-x-auto", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Recorded</th>
            <th className="px-3 py-2 font-semibold">pH</th>
            <th className="px-3 py-2 font-semibold">Turbidity</th>
            <th className="px-3 py-2 font-semibold">Temp</th>
            <th className="px-3 py-2 font-semibold">EC / TDS</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {readings.slice(0, limit).map((r) => {
            const status = STATUS[r.status] ?? STATUS.safe;
            return (
              <tr key={r.id} className="border-t border-line/70">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmt(r.recorded_at)}</td>
                <td className="px-3 py-2.5 font-semibold text-marine">{formatValue("ph", r.ph)}</td>
                <td className="px-3 py-2.5 text-slate-600">{formatValue("turbidity", r.turbidity)} NTU</td>
                <td className="px-3 py-2.5 text-slate-600">{formatValue("temperature", r.temperature)} °C</td>
                <td className="px-3 py-2.5 text-slate-600">{formatValue("tds", r.tds)} ppm</td>
                <td className="px-3 py-2.5">
                  <span className={cn("pill", status.bg, status.text)}>{status.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
