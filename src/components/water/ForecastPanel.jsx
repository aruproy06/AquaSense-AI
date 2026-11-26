import { useMemo, useState } from "react";
import { BrainCircuit, TrendingDown, TrendingUp } from "lucide-react";
import { BentoCard, CardHeading } from "@/components/water/BentoCard";
import { TrendChart } from "@/components/water/TrendChart";
import { PARAMS, PARAM_MAP, forecastSeries, formatValue } from "@/lib/water";
import { cn } from "@/lib/utils";

/** ML-style forecast panel: switch parameters, see history + projected trend. */
export function ForecastPanel({ readings = [], className, steps = 12 }) {
  const [active, setActive] = useState("ph");
  const param = PARAM_MAP[active];
  const forecast = useMemo(() => forecastSeries(readings, active, steps), [readings, active, steps]);

  const lastMeasured = [...readings].reverse().find((r) => r[active] !== null && r[active] !== undefined)?.[active];
  const projected = forecast.at(-1)?.value;
  const delta = projected != null && lastMeasured != null ? projected - Number(lastMeasured) : 0;
  const insideBand = projected != null && projected >= param.safeMin && projected <= param.safeMax;

  return (
    <BentoCard className={cn("flex flex-col", className)}>
      <CardHeading
        icon={BrainCircuit}
        title="ML trend forecast"
        hint="Damped regression projection · 80% confidence band"
        action={
          <div className="flex gap-1 rounded-xl bg-canvas p-1">
            {PARAMS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setActive(p.key)}
                aria-pressed={active === p.key}
                className={cn(
                  "min-h-[32px] rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
                  active === p.key ? "bg-white text-marine shadow-sm" : "text-slate-500 hover:text-marine",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-aqua-500" /> Measured
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-marine" /> Forecast
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-safe/20 ring-1 ring-safe/30" /> Normal range {param.standard}
        </span>
      </div>

      <div className="mt-2">
        <TrendChart readings={readings} forecast={forecast} paramKey={active} height={232} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-line/80 bg-canvas/60 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Projected next window</p>
          <p className="mt-0.5 font-display text-sm font-bold text-marine">
            {formatValue(active, projected)} {param.unit}
          </p>
        </div>
        <div className="rounded-2xl border border-line/80 bg-canvas/60 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Direction</p>
          <p className="mt-0.5 inline-flex items-center gap-1 font-display text-sm font-bold text-marine">
            {Math.abs(delta) < 0.01 ? (
              "Stable"
            ) : delta > 0 ? (
              <><TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Rising</>
            ) : (
              <><TrendingDown className="h-3.5 w-3.5 text-aqua-600" /> Falling</>
            )}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line/80 bg-canvas/60 px-3 py-2 sm:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Forecast verdict</p>
          <p className={cn("mt-0.5 font-display text-sm font-bold", insideBand ? "text-emerald-600" : "text-amber-600")}>
            {insideBand ? "Stays in safe band" : "May leave safe band"}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
