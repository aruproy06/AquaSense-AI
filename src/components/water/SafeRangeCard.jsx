import { Droplets, Info } from "lucide-react";
import { PARAMS, STANDARD_CITATION } from "@/lib/water";

/**
 * The safe drinking-water range reference shown beneath the sign-in form and in the
 * dashboard, so every user knows what "normal" looks like before reading a chart.
 */
export function SafeRangeCard({ className = "" }) {
  return (
    <div className={`rounded-3xl border border-line bg-white/80 p-5 shadow-bento backdrop-blur ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aqua-50 text-aqua-600">
            <Droplets className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold">Normal / Safe water range</h3>
            <p className="text-[11px] text-muted-foreground">Drinking-water reference band</p>
          </div>
        </div>
        <span className="pill bg-emerald-50 text-emerald-700">Safe zone</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        {PARAMS.map((p) => (
          <div key={p.key} className="rounded-2xl border border-line/80 bg-canvas/70 px-3 py-2.5">
            <dt className="text-[11px] font-medium text-muted-foreground">{p.label}</dt>
            <dd className="mt-0.5 font-display text-sm font-bold text-marine">{p.standard}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        Acceptable limits for drinking water per {STANDARD_CITATION}. Values beyond the band are flagged; sustained deviation is treated as contamination.
      </p>
    </div>
  );
}
