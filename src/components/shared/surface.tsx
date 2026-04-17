import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-border/80 bg-surface/90 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
