import type { Metadata } from "next";

import Link from "next/link";

import { RunNowButton } from "@/components/runs/run-now-button";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { Badge } from "@/components/shared/badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { Surface } from "@/components/shared/surface";
import { getResearchRunIndex } from "@/lib/intelligence/run-store";
import { formatLongDate } from "@/lib/intelligence/utils";

export const metadata: Metadata = {
  title: "Run Center",
  description:
    "Execute official-source research runs, review generated intelligence drafts, and publish approved snapshots into published mode.",
};

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const index = await getResearchRunIndex();
  const runs = index.runs;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <Surface className="p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Research Run Agent</Badge>
              <Badge>Run, review, publish</Badge>
              {index.latestPublished ? <Badge>Latest publish ready</Badge> : null}
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Run official-source research, then review before publish.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                Each run executes the live ingestion pipeline, captures source health,
                drafts the weekly brief, and waits for review before it can become the
                published dataset.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <RunNowButton />
            {index.latestPublished ? (
              <Link
                href="/?mode=published"
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground transition-colors hover:border-foreground"
              >
                Open published dashboard
              </Link>
            ) : null}
          </div>
        </div>
      </Surface>

      <Surface className="p-6">
        <SectionHeading
          eyebrow="Run history"
          title="Recent research runs"
          description="Review-ready runs can be published into the stable published mode. Failed runs stay visible so ingestion resilience is easy to explain."
        />
        <div className="mt-6 space-y-3">
          {runs.length > 0 ? (
            runs.map((run) => (
              <Link
                key={run.runId}
                href={`/runs/${run.runId}`}
                className="block rounded-[24px] border border-border/70 bg-panel px-5 py-5 transition-transform hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <RunStatusBadge status={run.status} />
                      <Badge>{run.sourceSuccessCount} of {run.sourceAttemptCount} sources live</Badge>
                      <Badge>{run.updateCount} ranked updates</Badge>
                      <Badge tone={run.hasNewSignals ? "accent" : "neutral"}>
                        {run.hasNewSignals
                          ? `${run.newSignalCount} new signal${run.newSignalCount === 1 ? "" : "s"}`
                          : "No new signals"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{run.headline}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Created {formatLongDate(run.createdAt)} / Updated {formatLongDate(run.updatedAt)}
                      </p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-panel-foreground">
                        {run.diffSummary ?? "Diff summary will appear after the run finishes."}
                      </p>
                    </div>
                  </div>
                  <div className="max-w-md text-sm leading-6 text-panel-foreground">
                    {run.topProducts.length > 0
                      ? `Top products: ${run.topProducts.join(", ")}`
                      : "No draft brief was produced for this run."}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-panel px-5 py-6 text-sm leading-6 text-muted-foreground">
              No research runs have been executed yet. Start one above to create the first
              reviewable draft and unlock published mode.
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
