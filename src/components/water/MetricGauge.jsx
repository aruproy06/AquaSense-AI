import { STATUS, evaluateParameter, formatValue } from "@/lib/water";
import { cn } from "@/lib/utils";

const CX = 100;
const CY = 100;
const R = 74;
const SWEEP = 240;

const polar = (angleDeg, r = R) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

const arc = (from, to, r = R) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
};

const clamp = (v) => Math.min(1, Math.max(0, v));

/** One parameter gauge with the reference band drawn on the dial. */
export function MetricGauge({ param, reading, className }) {
  const value = Number(reading?.[param.key]);
  const { level } = evaluateParameter(param.key, value);
  const status = STATUS[level];
  const pct = Number.isFinite(value) ? clamp((value - param.min) / (param.max - param.min)) : 0;
  const angle = -120 + pct * SWEEP;
  const safeFrom = -120 + clamp((param.safeMin - param.min) / (param.max - param.min)) * SWEEP;
  const safeTo = -120 + clamp((param.safeMax - param.min) / (param.max - param.min)) * SWEEP;
  const [dotX, dotY] = polar(angle, R);

  return (
    <div className={cn("bento-interactive flex flex-col p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-marine">{param.label}</p>
          <p className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">{param.hint}</p>
        </div>
        <span className={cn("pill shrink-0", status.bg, status.text)}>{status.label}</span>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[190px]">
        <svg viewBox="0 0 200 150" className="w-full" role="img" aria-label={`${param.label} ${formatValue(param.key, value)} ${param.unit}`}>
          <path d={arc(-120, 120)} stroke="#EEF2F6" strokeWidth={11} strokeLinecap="round" fill="none" />
          <path d={arc(safeFrom, safeTo)} stroke="#A7F3D0" strokeWidth={11} strokeLinecap="round" fill="none" />
          {Number.isFinite(value) && pct > 0 && (
            <path d={arc(-120, angle)} stroke={status.hex} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.95} />
          )}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const a = -120 + t * SWEEP;
            const [x1, y1] = polar(a, R - 15);
            const [x2, y2] = polar(a, R - 20);
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#CBD5E1" strokeWidth={1.5} strokeLinecap="round" />;
          })}
          <circle cx={dotX} cy={dotY} r={5.5} fill="#FFFFFF" stroke={status.hex} strokeWidth={3} />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-[6px] text-center">
          <span className="font-display text-[26px] font-extrabold leading-none text-marine">{formatValue(param.key, value)}</span>
          {param.unit && <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{param.unit}</span>}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-1">
        <div className="wave-strip h-1.5 rounded-full" aria-hidden="true" />
        <p className="text-[10.5px] text-muted-foreground">
          Safe band <span className="font-semibold text-slate-700">{param.standard}</span>
        </p>
      </div>
    </div>
  );
}
