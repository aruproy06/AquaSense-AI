import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { clientIp, rateLimit } from "@/lib/rate-limit.server";
import { audit } from "@/lib/audit.server";
import { randomDeviceId, randomToken, sha256Hex } from "@/lib/device-auth.server";
import {
  PARAMS,
  contaminationRisk,
  detectAnomalies,
  evaluateReading,
  forecastSeries,
  isUsableReading,
  normalizeReading,
} from "@/lib/water";

/* ------------------------------------------------------------------ */
/* Sign-in lockout — server-side ledger, keyed by a hash of the email. */
/* ------------------------------------------------------------------ */

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const LOCK_THRESHOLD = 5;

const reject = (status, message) => {
  setResponseStatus(status);
  return Object.assign(new Error(message), { status });
};

async function failuresSinceLastSuccess(base44, subjectHash) {
  const page = await base44.asServiceRole.entities.AuditLog.filter(
    { action: { $in: ["login_failed", "login_success"] }, subject_hash: subjectHash },
    { sort: "-created_date", limit: 50 },
  );
  const rows = page?.items ?? [];
  const since = Date.now() - LOCK_WINDOW_MS;
  let count = 0;
  for (const row of rows) {
    if (row.action === "login_success") break;
    if (row.action === "login_failed" && new Date(row.created_date).getTime() >= since) count += 1;
  }
  return count;
}

export const getLoginLockState = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().min(3).max(254) }))
  .handler(async ({ data, context }) => {
    const ip = clientIp(getRequest());
    if (!rateLimit(`login-lock:${ip}`, 40, 60_000).allowed) return { locked: false, remainingAttempts: LOCK_THRESHOLD };
    try {
      const hash = await sha256Hex(data.email.toLowerCase());
      const failures = await failuresSinceLastSuccess(context.getBase44(), hash);
      return {
        locked: failures >= LOCK_THRESHOLD,
        failures,
        remainingAttempts: Math.max(0, LOCK_THRESHOLD - failures),
        lockMinutes: 15,
      };
    } catch {
      // The lockout ledger is a UX safeguard on top of the platform's own auth; never block sign-in on its outage.
      return { locked: false, remainingAttempts: LOCK_THRESHOLD };
    }
  });

export const recordLoginFailure = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().min(3).max(254) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const ip = clientIp(getRequest());
    if (!rateLimit(`login-fail:${ip}`, 25, 60_000).allowed) return { recorded: false };
    const hash = await sha256Hex(data.email.toLowerCase());
    await audit(base44, { action: "login_failed", resource: "auth:login", outcome: "failure", ip, subject: data.email.toLowerCase() });
    const failures = await failuresSinceLastSuccess(base44, hash).catch(() => 0);
    return { recorded: true, failures, locked: failures >= LOCK_THRESHOLD, remainingAttempts: Math.max(0, LOCK_THRESHOLD - failures) };
  });

export const clearLoginFailures = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().min(3).max(254) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const ip = clientIp(getRequest());
    await audit(base44, { action: "login_success", resource: "auth:login", outcome: "success", ip, subject: data.email.toLowerCase() });
    return { cleared: true };
  });

/* ------------------------------------------------------------------ */
/* Devices — API keys are generated server-side and stored hashed.      */
/* ------------------------------------------------------------------ */

export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      location: z.string().trim().max(120).optional().default(""),
      sample_interval_seconds: z.number().int().min(5).max(3600).optional().default(30),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const ip = clientIp(getRequest());
    if (!rateLimit(`device-register:${context.user.id}`, 10, 60_000).allowed) throw reject(429, "Too many devices registered. Try again in a minute.");

    const apiKey = randomToken("aqk", 24);
    const device = await base44.entities.Device.create({
      owner_id: context.user.id,
      name: data.name,
      device_id: randomDeviceId(),
      location: data.location,
      status: "offline",
      sample_interval_seconds: data.sample_interval_seconds,
      owner_email: context.user.email,
      api_key_hash: await sha256Hex(apiKey),
      api_key_prefix: apiKey.slice(0, 10),
      key_created_at: new Date().toISOString(),
      active: true,
    });

    await audit(base44, {
      action: "device_registered",
      resource: `device:${device.id}`,
      userId: context.user.id,
      ip,
      subject: device.device_id,
    });

    return { device, apiKey };
  });

export const rotateDeviceKey = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ device_id: z.string().min(1).max(64) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const ip = clientIp(getRequest());
    if (!rateLimit(`device-rotate:${context.user.id}`, 10, 60_000).allowed) throw reject(429, "Too many key rotations. Try again in a minute.");

    // get() is scoped by the entity's access rules: another user's device is a 404 here.
    const device = await base44.entities.Device.get(data.device_id);
    const apiKey = randomToken("aqk", 24);
    const updated = await base44.entities.Device.update(device.id, {
      api_key_hash: await sha256Hex(apiKey),
      api_key_prefix: apiKey.slice(0, 10),
      key_created_at: new Date().toISOString(),
    });

    await audit(base44, {
      action: "device_key_rotated",
      resource: `device:${device.id}`,
      userId: context.user.id,
      ip,
      subject: device.device_id,
    });

    return { device: updated, apiKey };
  });

/* ------------------------------------------------------------------ */
/* File import — validated, parsed server-side, stored as readings.     */
/* ------------------------------------------------------------------ */

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    readings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timestamp: { type: "string", description: "ISO date/time of the sample if present" },
          ph: { type: "number" },
          turbidity: { type: "number" },
          temperature: { type: "number" },
          ec: { type: "number", description: "electrical conductivity uS/cm" },
          tds: { type: "number", description: "total dissolved solids ppm" },
        },
      },
    },
  },
  required: ["readings"],
};

const LIMITS = {
  ph: [0, 14],
  turbidity: [0, 5000],
  temperature: [-20, 90],
  tds: [0, 20000],
  ec: [0, 40000],
};

function rowIsSane(reading) {
  return Object.entries(LIMITS).every(([key, [min, max]]) => {
    const v = reading[key];
    return v === null || v === undefined || (Number.isFinite(v) && v >= min && v <= max);
  });
}

export const importReadings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      file_uri: z.string().min(6).max(600),
      file_name: z.string().trim().min(3).max(180),
      device_id: z.string().trim().max(64).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const ip = clientIp(getRequest());

    if (!rateLimit(`upload:${context.user.id}`, 6, 60_000).allowed) throw reject(429, "Upload limit reached. Please wait a minute.");

    // Extension whitelist re-checked on the server, independent of the browser.
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(data.file_name)) throw reject(400, "Only .csv, .xlsx, .xlsm and .xls files are accepted.");

    const deviceId = data.device_id || "UNASSIGNED";
    let extraction;
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: data.file_uri, expires_in: 300 });
      extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: signed_url, json_schema: EXTRACTION_SCHEMA });
    } catch (error) {
      await audit(base44, { action: "upload_rejected", resource: "upload", outcome: "failure", userId: context.user.id, ip, detail: { reason: error?.message } });
      throw reject(
        422,
        /\.xls$/i.test(data.file_name)
          ? "Legacy .xls workbooks cannot be parsed. Re-save the file as .xlsx or .csv and upload it again."
          : "The file could not be read. Check that it is a valid CSV/Excel export of sensor readings.",
      );
    }

    const rawRows = Array.isArray(extraction?.output) ? extraction.output : extraction?.output?.readings;
    if (extraction?.status !== "success" || !Array.isArray(rawRows)) {
      throw reject(422, extraction?.details || "No readings could be extracted from this file.");
    }
    if (rawRows.length === 0) throw reject(422, "The file contains no rows.");
    if (rawRows.length > 2000) throw reject(422, "Please split the file — a maximum of 2000 readings can be imported at once.");

    const accepted = [];
    let rejectedCount = 0;
    let flaggedCount = 0;

    rawRows.forEach((row) => {
      const reading = normalizeReading(row ?? {});
      if (!isUsableReading(reading) || !rowIsSane(reading)) {
        rejectedCount += 1;
        return;
      }
      const evaluation = evaluateReading(reading);
      if (evaluation.status !== "safe") flaggedCount += 1;
      accepted.push({
        owner_id: context.user.id,
        device_id: deviceId,
        ph: reading.ph,
        turbidity: reading.turbidity,
        temperature: reading.temperature,
        ec: reading.ec,
        tds: reading.tds,
        recorded_at: reading.recorded_at,
        status: evaluation.status,
        anomaly_flags: evaluation.flags.map((f) => f.message),
        source: "upload",
      });
    });

    if (accepted.length === 0) throw reject(422, "None of the rows contained usable sensor values.");

    const created = [];
    for (let i = 0; i < accepted.length; i += 200) {
      const batch = await base44.entities.WaterReading.bulkCreate(accepted.slice(i, i + 200));
      created.push(...(Array.isArray(batch) ? batch : []));
    }

    const upload = await base44.entities.Upload.create({
      file_name: data.file_name,
      file_uri: data.file_uri,
      device_id: deviceId,
      row_count: rawRows.length,
      accepted_count: accepted.length,
      rejected_count: rejectedCount,
      flagged_count: flaggedCount,
      status: rejectedCount > 0 ? "partial" : "processed",
      summary: `${accepted.length} readings imported · ${flaggedCount} outside the safe band · ${rejectedCount} rows rejected`,
    });

    // One alert per flagged parameter in the worst row, capped so a bad file cannot flood the log.
    const flaggedRows = created.filter((r) => r.status !== "safe").slice(0, 20);
    if (flaggedRows.length) {
      const alerts = flaggedRows.flatMap((r) =>
        (r.anomaly_flags ?? []).slice(0, 2).map((message) => ({
          owner_id: context.user.id,
          device_id: r.device_id,
          reading_id: r.id,
          parameter: message.split(" ")[0].toLowerCase(),
          value: r.ph,
          severity: r.status === "contaminated" ? "critical" : "warning",
          message: `${message} (imported reading · ${new Date(r.recorded_at).toISOString().slice(0, 16).replace("T", " ")})`,
          status: "open",
          source: "upload",
        })),
      );

      try {
        await base44.entities.Alert.bulkCreate(alerts.slice(0, 40));
        await base44.integrations.Core.SendEmail({
          to: context.user.email,
          from_name: "AquaSense AI",
          subject: `AquaSense AI — ${flaggedCount} flagged reading${flaggedCount === 1 ? "" : "s"} in ${data.file_name}`,
          body: `<p>Your import of <strong>${data.file_name}</strong> added ${accepted.length} readings.</p><p>${flaggedCount} reading(s) fell outside the safe drinking-water band and were logged as alerts.</p><p style="font-size:12px;color:#64748B">Limits: BIS IS 10500:2012 · WHO Guidelines.</p>`,
          text: `Import of ${data.file_name}: ${accepted.length} readings added, ${flaggedCount} flagged outside the safe band.`,
          category: "transactional",
        });
      } catch {
        // Alerting is best-effort; the import itself has already succeeded.
      }
    }

    await audit(base44, {
      action: "upload_imported",
      resource: `upload:${upload.id}`,
      userId: context.user.id,
      ip,
      detail: { file: data.file_name, accepted: accepted.length, rejected: rejectedCount, flagged: flaggedCount },
    });

    return {
      upload,
      accepted: accepted.length,
      rejected: rejectedCount,
      flagged: flaggedCount,
      rows: created.slice(0, 5),
    };
  });

/* ------------------------------------------------------------------ */
/* ML analysis — anomaly detection, risk score, trend forecasts.        */
/* ------------------------------------------------------------------ */

export const runMlAnalysis = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ device_id: z.string().trim().max(64).optional().default("") }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    if (!rateLimit(`ml:${context.user.id}`, 60, 60_000).allowed) throw reject(429, "Too many analysis requests. Please slow down.");

    const page = await base44.entities.WaterReading.filter(
      data.device_id ? { device_id: data.device_id } : {},
      { sort: "-recorded_at", limit: 500 },
    );
    const readings = (page?.items ?? []).slice().sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    if (readings.length === 0) {
      return { readings: 0, latest: null, evaluation: null, risk: 0, forecast: {}, anomalies: [], stats: {} };
    }

    const latest = readings[readings.length - 1];
    const forecast = {};
    const stats = {};
    PARAMS.forEach((p) => {
      forecast[p.key] = forecastSeries(readings, p.key, 12);
      const values = readings.map((r) => Number(r[p.key])).filter((v) => Number.isFinite(v));
      stats[p.key] = values.length
        ? {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
            samples: values.length,
          }
        : null;
    });

    const anomalies = detectAnomalies(readings, 24, 2.5).slice(-12);
    const evaluation = evaluateReading(latest);

    return {
      readings: readings.length,
      latest,
      evaluation,
      risk: contaminationRisk(latest),
      forecast,
      anomalies,
      stats,
      window: { from: readings[0]?.recorded_at, to: latest.recorded_at },
    };
  });

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export const updateAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ alert_id: z.string().min(1).max(64), status: z.enum(["open", "acknowledged", "resolved"]) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    return base44.entities.Alert.update(data.alert_id, {
      status: data.status,
      acknowledged_at: data.status === "open" ? null : new Date().toISOString(),
    });
  });
