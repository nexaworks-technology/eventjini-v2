import type { ReactNode } from "react";

/** Standard table treatment: optional toolbar row, bordered scroll container, consistent empty state. */
export function DataTableShell({ toolbar, children, footer }: { toolbar?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="space-y-3">
      {toolbar && <div className="flex flex-wrap items-end gap-2">{toolbar}</div>}
      <div className="overflow-x-auto rounded-xl border bg-card">{children}</div>
      {footer}
    </div>
  );
}
