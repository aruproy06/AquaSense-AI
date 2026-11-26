import { ArrowRight, BrainCircuit, Cloud, Cpu, Droplets, Users } from "lucide-react";
import { BentoCard } from "@/components/water/BentoCard";

const PIPELINE = [
  { icon: Cpu, title: "ESP32 sensors", text: "pH, turbidity, temperature, EC/TDS sampled at the edge" },
  { icon: Cloud, title: "Cloud database", text: "Signed HTTPS ingestion into a per-user isolated store" },
  { icon: BrainCircuit, title: "ML analysis", text: "Anomaly detection, contamination events, trend forecasts" },
  { icon: Droplets, title: "Dashboard & alerts", text: "Live status, flagged readings and email notifications" },
];

/** The project description, embedded in the product UI as required by the brief. */
export function ProjectCard({ className = "" }) {
  return (
    <BentoCard className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill bg-aqua-50 text-aqua-700">About AquaSense AI</span>
        <span className="pill bg-slate-100 text-slate-600">Final year project</span>
        <span className="pill bg-emerald-50 text-emerald-700">Drinking water</span>
      </div>

      <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight text-marine">
        Continuous water monitoring, machine-learning analysis, early contamination warning.
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
        The system uses sensors to measure important water parameters — pH, turbidity, temperature and electrical conductivity (EC/TDS).
        An ESP32 microcontroller collects these readings and transmits them to a cloud database. The collected data is analyzed using
        machine-learning algorithms to identify abnormal patterns, detect possible contamination events and estimate future water-quality
        trends. Users monitor real-time readings through this dashboard and receive alerts whenever unusual water conditions are detected.
        In simple words: AquaSense AI continuously monitors water, analyzes its quality using AI/ML, and warns users about possible
        contamination.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="relative rounded-2xl border border-line/80 bg-canvas/60 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-aqua-600 ring-1 ring-line">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="text-[12.5px] font-bold text-marine">{title}</p>
              {i < PIPELINE.length - 1 && <ArrowRight className="ml-auto hidden h-3.5 w-3.5 text-slate-300 lg:block" aria-hidden="true" />}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Built for households, water-quality teams, schools &amp; campuses, and researchers.
      </p>
    </BentoCard>
  );
}
