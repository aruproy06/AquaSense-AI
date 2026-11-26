import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { importReadings } from "@/lib/server-fns";
import { ACCEPT, validateReadingFile } from "@/lib/upload-guard";
import { cn } from "@/lib/utils";

/** Drag-and-drop (or tap) secure sensor-file ingest. */
export function UploadZone({ devices = [], className }) {
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState(devices[0]?.device_id ?? "");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  // Devices arrive after the first render; adopt the first one once it exists.
  useEffect(() => {
    if (!deviceId && devices[0]?.device_id) setDeviceId(devices[0].device_id);
  }, [devices, deviceId]);

  function resetPicker() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file) {
    setError("");
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    const guard = await validateReadingFile(file);
    if (!guard.ok) {
      setError(guard.error);
      setFileName("");
      resetPicker();
      return;
    }
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await importReadings({ data: { file_uri, file_name: guard.safeName, device_id: deviceId } });
      setResult(res);
      await queryClient.invalidateQueries();
      toast.success(`${res.accepted} readings imported`, { description: res.flagged ? `${res.flagged} flagged outside the safe band` : "All readings inside the safe band" });
    } catch (err) {
      setError(err?.message || "The import failed. Please try again.");
      setFileName("");
    } finally {
      setBusy(false);
      resetPicker();
    }
  }

  return (
    <div className={cn("bento p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-marine">
            <ShieldCheck className="h-4 w-4 text-aqua-600" aria-hidden="true" /> Secure sensor-file ingest
          </h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            .csv · .xlsx · .xls · max 5 MB · stored privately, never executed
          </p>
        </div>
        {devices.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
            Device
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="min-h-[36px] rounded-xl border border-line bg-white px-2 text-[12px] font-semibold text-marine focus:outline-none focus:ring-2 focus:ring-aqua-300"
            >
              <option value="">Unassigned</option>
              {devices.map((d) => (
                <option key={d.id} value={d.device_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-aqua-400 bg-aqua-50/70" : "border-line bg-canvas/60",
          busy && "opacity-70",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-aqua-600 shadow-sm ring-1 ring-line">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-5 w-5" aria-hidden="true" />}
        </span>
        <p className="mt-3 text-sm font-semibold text-marine">
          {busy ? `Parsing ${fileName || "your file"}…` : fileName ? fileName : "Drop your sensor file here"}
        </p>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          {busy ? "Validating every row against the drinking-water band" : "Columns: timestamp, ph, turbidity, temperature, ec or tds"}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-marine px-4 text-sm font-semibold text-white transition-colors hover:bg-marine/90 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> {fileName ? "Choose a different file" : "Choose file"}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Import complete
          </p>
          <p className="mt-1">
            {result.accepted} readings added · {result.flagged} flagged outside the safe band · {result.rejected} rows rejected.
          </p>
        </div>
      )}
    </div>
  );
}
