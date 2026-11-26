import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, ShieldAlert, Sparkles } from "lucide-react";
import { STATUS, formatValue, timeAgo } from "@/lib/water";
import { cn } from "@/lib/utils";

/** Hero status bento: monumental condition headline, purity, ML risk and live sparkline. */
export function ConditionHero({ reading, evaluation, series = [], sample, className }) {
  const status = STATUS[evaluation?.status ?? "safe"];
  const trend = series.length > 1 ? series[series.length - 1].value - series[series.length - 2].value : 0;
  const TrendIcon = Math.abs(trend) < 0.05 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 text-white shadow-bento sm:p-7",
        "bg-[linear-gradient(135deg,#0B2239_0%,#0C4A6E_45%,#0E7490_100%)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${status.hex}, transparent 65%)` }}
        aria-hidden="true"
      />
      <svg className="pointer-events-none absolute bottom-0 left-0 h-24 w-full opacity-25" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,80 C120,30 220,110 320,70 C420,30 520,100 600,60 L600,120 L0,120 Z" fill="#22D3EE" />
      </svg>

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill bg-white/10 text-[11px] uppercase tracking-[0.16em] text-aqua-100 ring-1 ring-white/15">
            Live water condition
          </span>
          {sample && <span className="pill bg-amber-400/15 text-[11px] text-amber-200 ring-1 ring-amber-300/30">Sample data</span>}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="led h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" aria-hidden="true" />
            updated {timeAgo(reading?.recorded_at)}
          </span>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-aqua-200/80">Status</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          {status.headline}
          <span className="ml-2 bg-gradient-to-r from-aqua-200 via-cyan-100 to-teal-200 bg-clip-text text-transparent">
            — {evaluation?.purity?.toFixed(1) ?? "0.0"}% purity
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
          {evaluation?.status === "safe"
            ? "Every measured parameter is inside the drinking-water acceptance band. The ML model sees no contamination signature in the current window."
            : `${evaluation?.flags?.length ?? 0} parameter${evaluation?.flags?.length === 1 ? "" : "s"} outside the acceptable drinking-water band — review the flags below.`}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-aqua-200/80">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> ML contamination risk
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {evaluation?.risk?.toFixed(1) ?? "0.0"}
              <span className="text-base font-bold text-aqua-200">%</span>
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-aqua-200/80">
                Live telemetry · pH
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
              </p>
              <div className="h-[64px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#7DD3FC" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#BAE6FD" strokeWidth={2} fill="url(#heroSpark)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-aqua-200/80">pH now</p>
              <p className="font-display text-2xl font-extrabold">{formatValue("ph", reading?.ph)}</p>
            </div>
          </div>
        </div>

        {evaluation?.flags?.length > 0 && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{evaluation.flags.map((f) => f.message).join(" · ")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
