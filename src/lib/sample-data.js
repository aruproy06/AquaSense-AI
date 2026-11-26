import { evaluateReading } from "@/lib/water";

// Clearly-labelled local sample telemetry used until real ESP32 readings exist.
// It never pretends to be live: the dashboard renders it behind a "Sample data" tag.
export function sampleReadings() {
  const now = Date.now();
  const base = { ph: 7.2, turbidity: 1.8, temperature: 24.4, tds: 268 };
  return Array.from({ length: 48 }, (_, i) => {
    const hoursAgo = 47 - i;
    const wobble = Math.sin(i / 3.1);
    const drift = Math.cos(i / 7.4);
    const reading = {
      id: `sample-${i}`,
      device_id: "AQ-ESP32-01",
      ph: Math.round((base.ph + wobble * 0.22 + drift * 0.08) * 100) / 100,
      turbidity: Math.round((base.turbidity + Math.abs(wobble) * 0.9 + (i > 38 ? 1.6 : 0)) * 100) / 100,
      temperature: Math.round((base.temperature + wobble * 1.4) * 10) / 10,
      ec: Math.round((base.tds * 2 + drift * 22) / 2) * 2,
      tds: Math.round(base.tds + drift * 18 + wobble * 9),
      source: "sample",
      recorded_at: new Date(now - hoursAgo * 3600e3).toISOString(),
    };
    reading.status = evaluateReading(reading).status;
    return reading;
  });
}

export const sampleDevice = {
  device_id: "AQ-ESP32-01",
  name: "Intake Manifold · ESP32",
  location: "Main storage tank — Block A",
  status: "online",
  battery: 87,
  signal: -58,
  firmware: "aquasense-fw 2.4.1",
  sample_interval_seconds: 30,
  last_seen: new Date(Date.now() - 42e3).toISOString(),
};

export const sampleAlerts = [
  {
    id: "a1",
    severity: "warning",
    parameter: "turbidity",
    value: 6.4,
    message: "Turbidity crossed 5 NTU — suspended solids rising after inlet flush",
    status: "open",
    created_date: new Date(Date.now() - 46 * 60e3).toISOString(),
  },
  {
    id: "a2",
    severity: "info",
    parameter: "ph",
    value: 6.9,
    message: "pH drifting toward the lower bound of the acceptable band",
    status: "acknowledged",
    created_date: new Date(Date.now() - 5.5 * 3600e3).toISOString(),
  },
  {
    id: "a3",
    severity: "critical",
    parameter: "tds",
    value: 612,
    message: "TDS exceeded 500 ppm — possible salinity ingress",
    status: "resolved",
    created_date: new Date(Date.now() - 28 * 3600e3).toISOString(),
  },
];
