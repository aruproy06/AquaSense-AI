import { evaluateReading, formatValue } from "@/lib/water";

const SEVERITY_RANK = { info: 1, warning: 2, critical: 3 };

function severityFor(level) {
  return level === "contaminated" ? "critical" : "warning";
}

function emailBody({ deviceName, reading, flags }) {
  const rows = flags
    .map(
      (f) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E2E8F0">${f.label}</td><td style="padding:6px 10px;border-bottom:1px solid #E2E8F0"><strong>${formatValue(f.parameter, f.value)}</strong></td><td style="padding:6px 10px;border-bottom:1px solid #E2E8F0">${f.message}</td></tr>`,
    )
    .join("");

  return {
    subject: `AquaSense AI alert — ${flags.length} parameter${flags.length === 1 ? "" : "s"} outside safe range (${deviceName})`,
    text: [
      `AquaSense AI detected an unusual water condition on ${deviceName}.`,
      ...flags.map((f) => `- ${f.label}: ${formatValue(f.parameter, f.value)} — ${f.message}`),
      `Measured at ${new Date(reading.recorded_at).toISOString()}.`,
      "Open the AquaSense AI dashboard to review the reading and acknowledge the alert.",
    ].join("\n"),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;color:#0F172A">
        <h2 style="margin:0 0 8px">AquaSense AI · contamination alert</h2>
        <p style="margin:0 0 16px;color:#475569">Unusual water conditions were detected on <strong>${deviceName}</strong>.</p>
        <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:620px">
          <thead><tr style="text-align:left;color:#64748B;font-size:12px"><th style="padding:6px 10px">Parameter</th><th style="padding:6px 10px">Value</th><th style="padding:6px 10px">Finding</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#64748B">Safe limits: BIS IS 10500:2012 · WHO Guidelines for Drinking-water Quality.</p>
      </div>`,
  };
}

/**
 * Evaluate a stored reading, persist alerts for anything outside the safe band and
 * email the device owner. Returns the alerts that were created.
 */
export async function raiseAlerts({ base44, reading, device, ownerEmail, source = "live", readingId, email = true }) {
  const evaluation = evaluateReading(reading);
  if (!evaluation.flags.length) return { evaluation, alerts: [] };

  const alerts = evaluation.flags.slice(0, 4).map((flag) => ({
    device_id: reading.device_id,
    reading_id: readingId,
    parameter: flag.parameter,
    value: flag.value,
    severity: severityFor(flag.level),
    message: flag.message,
    status: "open",
    source,
    created_by_id: device?.created_by_id,
  }));

  const created = await base44.asServiceRole.entities.Alert.bulkCreate(alerts);

  const top = evaluation.flags.reduce((max, f) => Math.max(max, SEVERITY_RANK[severityFor(f.level)] ?? 1), 0);
  if (email && ownerEmail && top >= SEVERITY_RANK.warning) {
    const body = emailBody({ deviceName: device?.name || reading.device_id, reading, flags: evaluation.flags });
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ownerEmail,
        from_name: "AquaSense AI",
        subject: body.subject,
        body: body.html,
        text: body.text,
        category: "transactional",
      });
      await base44.asServiceRole.entities.Alert.updateMany(
        { id: { $in: created.map((a) => a.id) } },
        { $set: { email_sent: true } },
      );
    } catch (error) {
      logEmailFailure(error);
    }
  }

  return { evaluation, alerts: created };
}

function logEmailFailure(error) {
  console.log(JSON.stringify({ level: "warn", action: "alert_email_failed", message: error?.message ?? "unknown" }));
}
