import { useMemo } from "react";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "12+ characters", test: (v) => v.length >= 12 },
  { label: "Upper & lower case", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /\d/.test(v) },
  { label: "A symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const LEVELS = [
  { label: "Very weak", color: "bg-danger" },
  { label: "Weak", color: "bg-orange-400" },
  { label: "Fair", color: "bg-warn" },
  { label: "Strong", color: "bg-emerald-400" },
  { label: "Excellent", color: "bg-safe" },
];

export function passwordStrength(value) {
  if (!value) return { score: 0, label: LEVELS[0].label, color: LEVELS[0].color, met: [] };
  const met = RULES.filter((r) => r.test(value));
  let score = met.length;
  if (value.length >= 16) score = Math.min(4, score + 1);
  if (value.length < 8) score = Math.min(score, 1);
  const level = LEVELS[score];
  return { score, label: level.label, color: level.color, met };
}

/** Live password-strength meter shown on the sign-up, reset and sign-in forms. */
export function PasswordStrength({ value, className }) {
  const { score, label, color, met } = useMemo(() => passwordStrength(value), [value]);
  if (!value) return null;

  return (
    <div className={cn("space-y-2", className)} aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn("font-semibold", score >= 3 ? "text-emerald-600" : score === 2 ? "text-amber-600" : "text-red-600")}>{label}</span>
      </div>
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-label="Password strength">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i < score ? color : "bg-slate-200")} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {RULES.map((rule) => (
          <li key={rule.label} className={cn("flex items-center gap-1", met.includes(rule) && "text-emerald-600")}>
            <span className={cn("h-1 w-1 rounded-full", met.includes(rule) ? "bg-emerald-500" : "bg-slate-300")} />
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
