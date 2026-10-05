import type { ReactNode } from "react";

export function FormSection({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card text-card-foreground">
      <div className="space-y-1 border-b px-5 py-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">{footer}</div>}
    </section>
  );
}
