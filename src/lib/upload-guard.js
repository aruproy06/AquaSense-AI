/**
 * Browser-side upload guard (defence in depth — the server re-validates everything).
 * Whitelists the extension, checks the size ceiling, inspects magic bytes so a renamed
 * executable is rejected, scans delimited text for script and formula injection, and
 * returns a sanitised file name.
 *
 * Deliberately lenient about the browser-reported MIME type: operating systems report
 * CSV/Excel files as text/csv, application/vnd.ms-excel, text/plain or nothing at all,
 * and rejecting on that guess blocks legitimate exports.
 */
export const MAX_BYTES = 5 * 1024 * 1024;
export const ACCEPT = ".csv,.xlsx,.xlsm,.xls";
export const ACCEPTED_EXT = ["csv", "xlsx", "xlsm", "xls"];
export const TEXT_EXT = ["csv"];

const ZIP_MAGIC = ["504b0304", "504b0506", "504b0708"];
const OLE_MAGIC = "d0cf11e0a1b11ae1";

const hex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

export function sanitizeFileName(name = "readings") {
  const cleaned = String(name).replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, "_").slice(-120);
  return cleaned || "readings.csv";
}

export function fileExtension(name = "") {
  return String(name).split(".").pop()?.toLowerCase() ?? "";
}

export async function validateReadingFile(file) {
  if (!file) return { ok: false, error: "Choose a file to import." };
  if (file.size === 0) return { ok: false, error: `“${file.name}” is empty.` };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `“${file.name}” is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 5 MB. Split it into smaller exports.` };
  }

  const ext = fileExtension(file.name);
  if (!ACCEPTED_EXT.includes(ext)) {
    return { ok: false, error: `“${file.name}” is not a spreadsheet. Upload a .csv, .xlsx or .xls file.` };
  }

  // Magic bytes: catch a renamed binary masquerading as a workbook.
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signature = hex(head);

  if ((ext === "xlsx" || ext === "xlsm") && !ZIP_MAGIC.some((m) => signature.startsWith(m))) {
    return { ok: false, error: `“${file.name}” is not a real Excel workbook — its contents do not match the .${ext} extension.` };
  }
  if (ext === "xls" && !signature.startsWith(OLE_MAGIC)) {
    return { ok: false, error: `“${file.name}” is not a real .xls workbook. Re-save it as .xlsx or .csv and try again.` };
  }

  if (TEXT_EXT.includes(ext)) {
    if (head.includes(0)) return { ok: false, error: "Binary content inside a .csv file was blocked." };
    const text = await file.slice(0, 65536).text();
    const threat = /<script|javascript:|=\s*(cmd|HYPERLINK|WEBSERVICE|IMPORTXML)\s*\(/i;
    if (threat.test(text)) return { ok: false, error: "The file contains executable or formula-injection content and was blocked." };
  }

  return { ok: true, safeName: sanitizeFileName(file.name), ext, size: file.size };
}
