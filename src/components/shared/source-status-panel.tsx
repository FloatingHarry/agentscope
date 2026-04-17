import { Badge } from "@/components/shared/badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { Surface } from "@/components/shared/surface";
import { type IntelligenceRuntimeMeta } from "@/lib/intelligence/runtime";
import { formatShortDate } from "@/lib/intelligence/utils";

export function SourceStatusGrid({
  sourceStatuses,
}: {
  sourceStatuses: NonNullable<IntelligenceRuntimeMeta["sourceStatuses"]>;
}) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {sourceStatuses.map((status) => (
        <div
          key={`${status.productSlug}-${status.source}`}
          className="rounded-[24px] border border-border/70 bg-panel px-5 py-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.status === "live" ? "accent" : "signal"}>
              {status.status === "live" ? "Live" : "Failed"}
            </Badge>
            <Badge>{status.product}</Badge>
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">{status.source}</p>
          <a
            href={status.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm text-teal transition-colors hover:text-foreground"
          >
            Open source
          </a>
          {status.status === "live" ? (
            <div className="mt-4 space-y-2 text-sm text-panel-foreground">
              <p>{status.updateCount} recent updates parsed</p>
              <p className="text-muted-foreground">
                Latest {status.latestPublishedAt ? formatShortDate(status.latestPublishedAt) : "n/a"}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-panel-foreground">
              {status.errorMessage ?? "This source did not return a usable update batch."}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function SourceStatusPanel({
  runtime,
}: {
  runtime: IntelligenceRuntimeMeta;
}) {
  const sourceStatuses = runtime.sourceStatuses ?? [];

  if (runtime.requestedMode !== "live" || sourceStatuses.length === 0) {
    return null;
  }

  const liveCount = sourceStatuses.filter((status) => status.status === "live").length;
  const failedCount = sourceStatuses.length - liveCount;
  const description =
    runtime.resolvedMode === "mock"
      ? "Live mode was requested, but the official ingestion run could not produce a stable dataset. These cards show which sources failed before the app fell back to the demo dataset."
      : "Each card reflects one official source used by the live ingestion run, so you can see exactly which product feeds are active right now.";

  return (
    <Surface className="p-6">
      <SectionHeading
        eyebrow="Live source status"
        title="Official source health"
        description={description}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{liveCount} live</Badge>
            {failedCount > 0 ? <Badge tone="signal">{failedCount} failed</Badge> : null}
          </div>
        }
      />
      <SourceStatusGrid sourceStatuses={sourceStatuses} />
    </Surface>
  );
}
