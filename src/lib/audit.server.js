import { sha256Hex } from "@/lib/device-auth.server";

const SECRET_KEYS = /pass(word)?|token|secret|key|authorization|cookie|otp|mfa/i;
const EMAIL_KEYS = /email|recipient|to$/i;

/** Strip secrets and PII from anything that reaches a log line or the audit trail. */
export function redact(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.test(k)) out[k] = "[redacted]";
      else if (EMAIL_KEYS.test(k)) out[k] = "[redacted-email]";
      else out[k] = redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 400) return `${value.slice(0, 400)}…`;
  return value;
}

/** Structured, redacted logging: one JSON line, never raw credentials or PII. */
export function logEvent(level, action, detail = {}) {
  console.log(JSON.stringify({ level, action, at: new Date().toISOString(), ...redact(detail) }));
}

/** Append an immutable audit entry (service role, so users cannot forge or edit it). */
export async function audit(base44, { action, resource = "", detail = {}, outcome = "success", ip, userId, subject }) {
  try {
    logEvent(outcome === "failure" ? "warn" : "info", action, detail);
    await base44.asServiceRole.entities.AuditLog.create({
      action,
      resource,
      outcome,
      detail: JSON.stringify(redact(detail)).slice(0, 900),
      ip_hash: ip ? await sha256Hex(ip) : undefined,
      user_id: userId,
      subject_hash: subject ? await sha256Hex(subject) : undefined,
    });
  } catch {
    // Auditing must never break the request it is recording.
  }
}
