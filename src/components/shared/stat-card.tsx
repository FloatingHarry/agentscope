import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export function StatCard({
  label,
  value,
  hint,
  className,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-[24px] border border-border/70 bg-panel px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p>
        </div>
        {icon ? (
          <div className="rounded-2xl border border-border/80 bg-surface px-3 py-2 text-sm font-medium text-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
