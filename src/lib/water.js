/**
 * Water-quality science layer shared by the dashboard, the ingestion endpoints and
 * the upload importer. Ranges follow BIS IS 10500:2012 (acceptable limits for
 * drinking water) and WHO Guidelines for Drinking-water Quality (4th ed.).
 */

export const STANDARD_CITATION = "BIS IS 10500:2012 · WHO Guidelines for Drinking-water Quality (4th ed.)";

export const PARAMS = [
  {
    key: "ph",
    label: "pH",
    short: "pH",
    unit: "",
    min: 0,
    max: 14,
    safeMin: 6.5,
    safeMax: 8.5,
    idealMin: 7.0,
    idealMax: 7.6,
    decimals: 2,
    hint: "Acidity / alkalinity balance",
    standard: "6.5 – 8.5",
  },
  {
    key: "turbidity",
    label: "Turbidity",
    short: "NTU",
    unit: "NTU",
    min: 0,
    max: 20,
    safeMin: 0,
    safeMax: 5,
    idealMin: 0,
    idealMax: 1,
    decimals: 2,
    hint: "Suspended solids & cloudiness",
    standard: "< 5 NTU",
  },
  {
    key: "temperature",
    label: "Temperature",
    short: "°C",
    unit: "°C",
    min: 0,
    max: 50,
    safeMin: 10,
    safeMax: 30,
    idealMin: 18,
    idealMax: 26,
    decimals: 1,
    hint: "Thermal stability of the source",
    standard: "10 – 30 °C",
  },
  {
    key: "tds",
    label: "EC / TDS",
    short: "ppm",
    unit: "ppm",
    min: 0,
    max: 1200,
    safeMin: 0,
    safeMax: 500,
    idealMin: 80,
    idealMax: 300,
    decimals: 0,
    hint: "Dissolved salts & conductivity",
    standard: "< 500 ppm",
  },
];

export const PARAM_MAP = PARAMS.reduce((acc, p) => ({ ...acc, [p.key]: p }), {});

export const STATUS = {
  safe: {
    key: "safe",
    label: "Safe",
    headline: "OPTIMAL",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-safe",
    hex: "#10B981",
  },
  warning: {
    key: "warning",
    label: "Warning",
    headline: "CAUTION",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-warn",
    hex: "#F59E0B",
  },
  contaminated: {
    key: "contaminated",
    label: "Contaminated",
    headline: "CONTAMINATED",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-danger",
    hex: "#EF4444",
  },
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** Grade a single parameter against its acceptable limit. */
export function evaluateParameter(key, rawValue) {
  const param = PARAM_MAP[key];
  const value = num(rawValue);
  if (!param || value === null) return { level: "warning", param, value, deviation: 0 };

  const span = Math.max(param.safeMax - param.safeMin, 0.0001);
  if (value >= param.safeMin && value <= param.safeMax) {
    return { level: "safe", param, value, deviation: 0 };
  }
  const over = value > param.safeMax ? value - param.safeMax : param.safeMin - value;
  const ratio = over / span;
  // Beyond 25% of the acceptable band outside the limit is treated as contamination.
  const level = ratio > 0.25 ? "contaminated" : "warning";
  return { level, param, value, deviation: over };
}

/** Full reading evaluation: overall status, per-parameter flags and a purity score. */
export function evaluateReading(reading = {}) {
  const results = PARAMS.map((p) => evaluateParameter(p.key, reading[p.key]));
  const levels = results.map((r) => r.level);
  const status = levels.includes("contaminated")
    ? "contaminated"
    : levels.includes("warning")
      ? "warning"
      : "safe";

  const flags = results
    .filter((r) => r.level !== "safe")
    .map((r) => ({
      parameter: r.param.key,
      label: r.param.label,
      level: r.level,
      value: r.value,
      message:
        r.value > r.param.safeMax
          ? `${r.param.label} above the acceptable limit (${r.param.standard})`
          : `${r.param.label} below the acceptable limit (${r.param.standard})`,
    }));

  return { status, flags, purity: purityScore(reading), results };
}

/** 0–100 purity: distance of each parameter from its ideal operating band. */
export function purityScore(reading = {}) {
  const scores = PARAMS.map((p) => {
    const value = num(reading[p.key]);
    if (value === null) return 0.6;
    if (value >= p.idealMin && value <= p.idealMax) return 1;
    const span = Math.max(p.safeMax - p.safeMin, 0.0001);
    const out = value > p.safeMax ? value - p.safeMax : value < p.safeMin ? p.safeMin - value : 0;
    return Math.max(0, 1 - out / span);
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 1000) / 10;
}

/** ML-style contamination risk: how far the current reading sits from the safe envelope. */
export function contaminationRisk(reading = {}) {
  const risk = PARAMS.reduce((acc, p) => {
    const value = num(reading[p.key]);
    if (value === null) return acc + 20;
    const span = Math.max(p.safeMax - p.safeMin, 0.0001);
    const out =
      value > p.safeMax ? (value - p.safeMax) / span : value < p.safeMin ? (p.safeMin - value) / span : 0;
    return acc + Math.min(100, out * 55);
  }, 0);
  return Math.min(99.9, Math.round((risk / PARAMS.length) * 10) / 10);
}

export function normalizeReading(row = {}) {
  const pick = (...keys) => {
    for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    return null;
  };
  const ph = num(pick("ph", "pH", "PH", "p_h"));
  const turbidity = num(pick("turbidity", "turbidity_ntu", "ntu", "Turbidity"));
  const temperature = num(pick("temperature", "temp", "temperature_c", "Temperature"));
  const ec = num(pick("ec", "conductivity", "ec_us_cm", "EC"));
  const tdsRaw = num(pick("tds", "tds_ppm", "TDS"));
  // EC (µS/cm) ≈ TDS (ppm) × 2 — derive whichever column the file carries.
  const tds = tdsRaw ?? (ec !== null ? Math.round(ec * 0.5) : null);
  const recorded = pick("recorded_at", "timestamp", "time", "date", "datetime");
  return {
    ph,
    turbidity,
    temperature,
    ec: ec ?? (tds !== null ? Math.round(tds * 2) : null),
    tds,
    recorded_at: recorded ? new Date(recorded).toISOString() : new Date().toISOString(),
  };
}

export function isUsableReading(reading) {
  return [reading.ph, reading.turbidity, reading.temperature, reading.tds].some((v) => v !== null);
}

/** Ordinary least squares trend + damped projection, with a widening confidence band. */
export function forecastSeries(readings, key, steps = 12) {
  const rows = readings
    .filter((r) => num(r[key]) !== null)
    .slice()
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  if (rows.length < 4) return [];

  const ys = rows.map((r) => num(r[key]));
  const n = ys.length;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let numr = 0;
  let den = 0;
  ys.forEach((y, i) => {
    numr += (i - meanX) * (y - meanY);
    den += (i - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : numr / den;
  const sd = Math.sqrt(ys.reduce((a, y) => a + (y - meanY) ** 2, 0) / n) || 0.1;

  const last = rows[rows.length - 1];
  const lastTime = new Date(last.recorded_at).getTime();
  const cadence = n > 1 ? Math.max(60e3, (lastTime - new Date(rows[0].recorded_at).getTime()) / (n - 1)) : 3600e3;

  return Array.from({ length: steps }, (_, i) => {
    const step = i + 1;
    const trend = meanY + slope * (n - 1 + step - meanX);
    // Damp toward the recent mean so a short spike never explodes the projection.
    const value = trend * 0.72 + meanY * 0.28;
    const band = sd * (1 + step * 0.16);
    return {
      recorded_at: new Date(lastTime + cadence * step).toISOString(),
      value: Math.round(value * 1000) / 1000,
      lower: Math.round((value - band) * 1000) / 1000,
      upper: Math.round((value + band) * 1000) / 1000,
      forecast: true,
    };
  });
}

/** Z-score anomaly detection over the trailing window of readings. */
export function detectAnomalies(readings, windowSize = 24, threshold = 2.5) {
  const sorted = readings.slice().sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const anomalies = [];
  PARAMS.forEach((p) => {
    const values = sorted.map((r) => num(r[p.key])).filter((v) => v !== null);
    if (values.length < 6) return;
    const window = values.slice(-windowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const sd = Math.sqrt(window.reduce((a, v) => a + (v - mean) ** 2, 0) / window.length) || 0;
    sorted.slice(-6).forEach((r) => {
      const v = num(r[p.key]);
      if (v === null || sd === 0) return;
      const z = Math.abs((v - mean) / sd);
      if (z >= threshold) {
        anomalies.push({
          parameter: p.key,
          label: p.label,
          value: v,
          z: Math.round(z * 100) / 100,
          recorded_at: r.recorded_at,
          message: `${p.label} deviated ${z.toFixed(1)}σ from the 24-reading baseline`,
        });
      }
    });
  });
  return anomalies;
}

export function formatValue(key, value) {
  const p = PARAM_MAP[key];
  const v = num(value);
  if (v === null) return "—";
  return v.toFixed(p?.decimals ?? 2);
}

export function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "unknown";
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}
