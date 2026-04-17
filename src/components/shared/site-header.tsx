"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cx } from "@/lib/cx";
import { buildModeHref, parseIntelligenceMode } from "@/lib/intelligence/runtime";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/compare", label: "Compare" },
  { href: "/weekly-brief", label: "Weekly Brief" },
  { href: "/runs", label: "Runs" },
];

function HeaderShell({
  pathname,
  mode,
}: {
  pathname?: string;
  mode: ReturnType<typeof parseIntelligenceMode>;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href={buildModeHref("/", mode)} className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal">
              AI Product Intelligence Agent
            </p>
            <p className="text-sm text-muted-foreground">
              Competitive signals for product and strategy teams
            </p>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navigation.map((item) => {
            const active =
              pathname !== undefined &&
              (pathname === item.href ||
                (item.href === "/" && pathname === "/") ||
                (item.href !== "/" && pathname.startsWith(item.href)));

            return (
              <Link
                key={item.href}
                href={buildModeHref(item.href, mode)}
                className={cx(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "border border-teal/20 bg-teal/10 text-teal"
                    : "bg-panel text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = parseIntelligenceMode(searchParams.get("mode"));

  return <HeaderShell pathname={pathname} mode={mode} />;
}

export function SiteHeaderFallback() {
  return <HeaderShell mode="mock" />;
}
