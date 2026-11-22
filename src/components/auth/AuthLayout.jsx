import { Activity, BellRing, Cpu, Droplets, ShieldCheck } from "lucide-react";

// Full-screen split layout shared by every auth page: brand + project story on the
// left, the form card on the right. Consistent with the dashboard's water palette.
export function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-canvas text-foreground lg:grid lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-marine px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 500px at 15% 0%, rgba(14,165,233,0.45), transparent 60%), radial-gradient(700px 500px at 90% 100%, rgba(20,184,166,0.35), transparent 60%)",
          }}
        />
        <svg className="pointer-events-none absolute -bottom-6 left-0 h-56 w-full opacity-30" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,120 C100,60 200,180 300,120 C400,60 500,160 600,100 L600,200 L0,200 Z" fill="#0EA5E9" />
          <path d="M0,150 C120,100 220,190 320,150 C420,110 520,180 600,140 L600,200 L0,200 Z" fill="#22D3EE" opacity="0.5" />
        </svg>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Droplets className="h-6 w-6 text-aqua-300" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight">AquaSense AI</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-aqua-200/80">Water quality intelligence</p>
            </div>
          </div>

          <h2 className="mt-12 max-w-md font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Continuous monitoring.
            <span className="block bg-gradient-to-r from-aqua-300 via-cyan-200 to-teal-200 bg-clip-text text-transparent">
              Early contamination warning.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
            ESP32 sensors measure pH, turbidity, temperature and EC/TDS, stream readings to the cloud, and machine-learning
            models flag abnormal patterns before drinking water becomes unsafe.
          </p>

          <ul className="mt-8 grid max-w-md gap-3">
            {[
              { icon: Cpu, text: "ESP32 edge sensors → secured cloud ingestion" },
              { icon: Activity, text: "ML anomaly detection & trend forecasting" },
              { icon: BellRing, text: "Instant in-app and email contamination alerts" },
              { icon: ShieldCheck, text: "Per-user isolation, MFA and signed device webhooks" },
            ].map(({ icon: RowIcon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur">
                <RowIcon className="h-4 w-4 shrink-0 text-aqua-300" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 text-xs text-slate-400">
          Drinking-water limits per BIS IS 10500:2012 &amp; WHO Guidelines for Drinking-water Quality.
        </p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua-500 text-white">
                <Droplets className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base font-extrabold tracking-tight">AquaSense AI</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Water quality intelligence</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-aqua-50 text-aqua-600 ring-1 ring-aqua-100">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-bento sm:p-8">{children}</div>
          {footer}
        </div>
      </main>
    </div>
  );
}
