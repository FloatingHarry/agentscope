import Link from "next/link";

import { Badge } from "@/components/shared/badge";
import { Surface } from "@/components/shared/surface";
import { buildModeHref, type IntelligenceRuntimeMeta } from "@/lib/intelligence/runtime";

export function PublishedModeEmptyState({
  runtime,
  title,
  description,
}: {
  runtime: IntelligenceRuntimeMeta;
  title: string;
  description: string;
}) {
  if (runtime.requestedMode !== "published" || runtime.publishedAvailable !== false) {
    return null;
  }

  return (
    <Surface className="p-8">
      <div className="max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="signal">Published mode unavailable</Badge>
          <Badge>Run Center needs a review-approved run</Badge>
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={buildModeHref("/runs", runtime.requestedMode)}
            className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-medium text-teal transition-colors hover:border-teal/30 hover:bg-surface"
          >
            Open Run Center
          </Link>
          <Link
            href={buildModeHref("/", "live")}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground transition-colors hover:border-foreground"
          >
            Preview official live mode
          </Link>
        </div>
      </div>
    </Surface>
  );
}
