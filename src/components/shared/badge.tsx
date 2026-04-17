import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

const toneClasses = {
  neutral: "border-border/80 bg-panel text-panel-foreground",
  accent: "border-teal/20 bg-teal/10 text-teal",
  signal: "border-amber/25 bg-amber/12 text-amber-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
