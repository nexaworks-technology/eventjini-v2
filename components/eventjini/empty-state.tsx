import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action, icon: Icon, children }: { title: string; description?: ReactNode; action?: ReactNode; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && <div className="max-w-md text-sm text-muted-foreground">{description}</div>}
      </div>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}
