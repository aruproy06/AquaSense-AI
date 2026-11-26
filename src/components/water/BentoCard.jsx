import { cn } from "@/lib/utils";

/** Shared bento card surface: rounded, hairline border, ambient aqua shadow. */
export function BentoCard({ as: Tag = "div", interactive = false, className, children, ...props }) {
  return (
    <Tag className={cn(interactive ? "bento-interactive" : "bento", "p-5", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeading({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aqua-50 text-aqua-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <div>
          <h2 className="text-sm font-bold leading-tight text-marine">{title}</h2>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
