import { type IntelligenceRuntimeMeta } from "@/lib/intelligence/runtime";
import { formatLongDate } from "@/lib/intelligence/utils";

import { Badge } from "@/components/shared/badge";

export function DatasetModeCallout({
  runtime,
}: {
  runtime: IntelligenceRuntimeMeta;
}) {
  const isFallback =
    runtime.requestedMode === "live" && runtime.resolvedMode === "mock";
  const isPublished = runtime.requestedMode === "published";
  const isOfficialLive =
    runtime.resolvedMode === "live" && runtime.sourceVariant === "official-sources";
  const isInternalOverride =
    runtime.resolvedMode === "live" && runtime.sourceVariant === "curated-json";
  const primaryTone = isFallback
    ? "signal"
    : isPublished && runtime.publishedAvailable === false
      ? "signal"
      : isPublished
        ? "accent"
    : runtime.resolvedMode === "live"
      ? "accent"
      : "neutral";
  const primaryLabel = isFallback
    ? "Live preview fallback"
    : isPublished && runtime.publishedAvailable === false
      ? "No published run yet"
      : isPublished
        ? "Published research run"
    : isOfficialLive
      ? "Official source preview"
      : isInternalOverride
        ? "Internal override"
        : runtime.resolvedMode === "live"
          ? "Live preview"
        : "Mock dataset";
  const sourceLabel = isOfficialLive
    ? runtime.sourceAttemptCount && runtime.sourceSuccessCount !== undefined
      ? `${runtime.sourceSuccessCount} of ${runtime.sourceAttemptCount} sources live`
      : "Official product sources"
    : isPublished && runtime.publishedAvailable === false
      ? "Run Center is waiting for its first publish"
    : isPublished
      ? runtime.publishedRunId
        ? `Published from ${runtime.publishedRunId}`
        : "Review-approved dataset"
    : isInternalOverride
      ? "Curated debug feed"
      : runtime.resolvedMode === "live"
        ? "Live sources"
      : "Stable demo dataset";
  const description = isFallback
    ? `Live preview was requested, but ${runtime.fallbackReason ?? "the live feed was unavailable"}. The page is using the stable mock dataset instead.`
    : isPublished && runtime.publishedAvailable === false
      ? "No review-approved research run has been published yet. Open Run Center to execute an official source run, review the draft brief, and publish it into this mode."
    : isPublished
      ? `This view is reading the latest review-approved research run${runtime.publishedHeadline ? `, headed by "${runtime.publishedHeadline}"` : ""}, instead of the raw live preview.`
    : isOfficialLive
      ? `Research agent pipeline is ranking official product updates from ${runtime.activeSourceLabels?.join(", ") ?? "configured sources"} against the current date.`
      : isInternalOverride
        ? "Research agent pipeline is using an internal curated override for parser testing and debugging."
      : runtime.resolvedMode === "live"
      ? "Research agent pipeline is ranking live product sources against the current date."
      : "Research agent pipeline is using the stable mock dataset so the demo stays presentation-safe.";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={primaryTone}>{primaryLabel}</Badge>
        <Badge>{sourceLabel}</Badge>
        <Badge>Generated {formatLongDate(runtime.generatedAt)}</Badge>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
