import type { ReactNode } from "react";

/** Page title + optional supporting copy + primary actions. Used by every organizer page. */
export function PageHeader({ title, description, actions, eyebrow, level = 1 }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; level?: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>}
        <Heading className={level === 1 ? "font-heading text-2xl font-semibold tracking-tight text-foreground" : "font-heading text-xl font-semibold tracking-tight text-foreground"}>{title}</Heading>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{children}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
