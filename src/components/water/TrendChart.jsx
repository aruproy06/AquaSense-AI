import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PARAM_MAP, formatValue } from "@/lib/water";

const fmtTick = (t) =>
  new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Calcutta" });

function ChartTooltip({ active, payload, param }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const isForecast = row.forecast !== undefined && row.value === undefined;
  return (
    <div className="rounded-xl border border-line bg-white/95 px-3 py-2 text-xs shadow-bento backdrop-blur">
      <p className="font-semibold text-marine">
        {new Date(row.t).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Calcutta" })}
      </p>
      <p className="mt-1 text-slate-600">
        {isForecast ? "Forecast" : "Measured"}:{" "}
        <span className="font-bold text-marine">
          {formatValue(param.key, isForecast ? row.forecast : row.value)} {param.unit}
        </span>
      </p>
      {isForecast && (
        <p className="text-[11px] text-slate-500">
          80% band {formatValue(param.key, row.band?.[0])} – {formatValue(param.key, row.band?.[1])} {param.unit}
        </p>
      )}
    </div>
  );
}

/**
 * Historical trend with the normal drinking-water range drawn as a shaded band,
 * plus the ML forecast series (dashed) and its confidence band.
 */
export function TrendChart({ readings = [], forecast = [], paramKey = "ph", height = 220, showForecast = true }) {
  const param = PARAM_MAP[paramKey];
  const history = readings
    .filter((r) => r[paramKey] !== null && r[paramKey] !== undefined)
    .map((r) => ({ t: new Date(r.recorded_at).getTime(), value: Number(r[paramKey]) }))
    .sort((a, b) => a.t - b.t);

  const future = showForecast
    ? forecast.map((f) => ({
        t: new Date(f.recorded_at).getTime(),
        forecast: f.value,
        band: [f.lower, f.upper],
      }))
    : [];

  const data = [...history, ...future];

  if (!data.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/60 text-xs text-muted-foreground" style={{ height }}>
        No readings yet — upload a sensor file or connect a device.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={`histFill-${paramKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDF2F7" vertical={false} />
          <ReferenceArea y1={param.safeMin} y2={param.safeMax} fill="#10B981" fillOpacity={0.09} stroke="#10B981" strokeOpacity={0.25} strokeDasharray="4 4" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtTick}
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
          <Tooltip content={<ChartTooltip param={param} />} />
          <Area type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2.4} fill={`url(#histFill-${paramKey})`} isAnimationActive={false} connectNulls />
          {showForecast && <Area type="monotone" dataKey="band" stroke="none" fill="#0EA5E9" fillOpacity={0.12} isAnimationActive={false} />}
          {showForecast && <Line type="monotone" dataKey="forecast" stroke="#0F172A" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
