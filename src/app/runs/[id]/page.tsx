import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { RunQuestionAssistant } from "@/components/runs/run-question-assistant";
import { RunReviewActions } from "@/components/runs/run-review-actions";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { Badge } from "@/components/shared/badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { SourceStatusGrid } from "@/components/shared/source-status-panel";
import { Surface } from "@/components/shared/surface";
import { getResearchRun } from "@/lib/intelligence/run-store";
import { formatLongDate, formatShortDate } from "@/lib/intelligence/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const run = await getResearchRun(id);

  if (!run) {
    return {};
  }

  return {
    title: `Run ${run.runId}`,
    description:
      run.weeklyInsight?.summary ??
      run.failureReason ??
      "Research run detail for the AI Product Intelligence Agent.",
  };
}

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getResearchRun(id);

  if (!run) {
    notFound();
  }

  const sourceStatuses = run.runtime.sourceStatuses ?? [];
  const liveCount = sourceStatuses.filter((status) => status.status === "live").length;
  const failedCount = sourceStatuses.length - liveCount;
  const llmConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const suggestedQuestions = [
    "Which product showed the strongest workflow movement in this run?",
    `What is ${(run.weeklyInsight?.topProducts[0] ?? run.products[0]?.name ?? "ChatGPT")} focusing on most recently in this run?`,
    "Which official sources best support the current weekly brief?",
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <Surface className="p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-5">
            <Link
              href="/runs"
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal"
            >
              Run Center / Run Detail
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <RunStatusBadge status={run.status} />
              <Badge>{liveCount} live</Badge>
              {failedCount > 0 ? <Badge tone="signal">{failedCount} failed</Badge> : null}
              <Badge>{run.updates.length} ranked updates</Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                {run.weeklyInsight?.headline ?? "Research run detail"}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {run.weeklyInsight?.summary ??
                  run.failureReason ??
                  "This run is tracking official-source ingestion and draft generation state."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.weeklyInsight?.topProducts.map((product) => (
                <Badge key={product} tone="accent">
                  {product}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <RunReviewActions runId={run.runId} status={run.status} />
            {run.status === "published" ? (
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

      <section className="grid gap-6 lg:grid-cols-3">
        <Surface className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Created
          </p>
          <p className="mt-3 text-base font-semibold text-foreground">
            {formatLongDate(run.createdAt)}
          </p>
        </Surface>
        <Surface className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Last updated
          </p>
          <p className="mt-3 text-base font-semibold text-foreground">
            {formatLongDate(run.updatedAt)}
          </p>
        </Surface>
        <Surface className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Source health
          </p>
          <p className="mt-3 text-base font-semibold text-foreground">
            {run.runtime.sourceSuccessCount ?? 0} of {run.runtime.sourceAttemptCount ?? 0} sources live
          </p>
        </Surface>
        <Surface className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Run diff
          </p>
          <p className="mt-3 text-base font-semibold text-foreground">
            {run.diff.hasNewSignals
              ? `${run.diff.newUpdateIds.length} new signal${run.diff.newUpdateIds.length === 1 ? "" : "s"}`
              : "No new signals"}
          </p>
        </Surface>
      </section>

      <Surface className="p-6">
        <SectionHeading
          eyebrow="Run diff"
          title="What changed since the previous run"
          description={run.diff.summary}
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Compared to
            </p>
            <p className="mt-3 text-base font-semibold text-foreground">
              {run.diff.comparedToRunId ?? "First recorded run"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {run.diff.comparedToCreatedAt
                ? `Baseline created ${formatLongDate(run.diff.comparedToCreatedAt)}`
                : "Future runs will use this run as their baseline."}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              New signals
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {run.diff.newUpdateIds.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Newly ranked updates that were not present in the previous run.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Products with new updates
            </p>
            <p className="mt-3 text-base font-semibold text-foreground">
              {run.diff.newProducts.length > 0 ? run.diff.newProducts.join(", ") : "None"}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Unchanged sources
            </p>
            <p className="mt-3 text-base font-semibold text-foreground">
              {run.diff.unchangedSources.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Official sources whose status and newest parsed update were unchanged.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Changed sources
            </p>
            <p className="mt-3 text-sm leading-6 text-panel-foreground">
              {run.diff.changedSources.length > 0
                ? run.diff.changedSources.join(", ")
                : "No source changed state or coverage since the previous run."}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Removed signals
            </p>
            <p className="mt-3 text-sm leading-6 text-panel-foreground">
              {run.diff.removedUpdateIds.length > 0
                ? `${run.diff.removedUpdateIds.length} older ranked signal${
                    run.diff.removedUpdateIds.length === 1 ? "" : "s"
                  } dropped out of the current recent window.`
                : "No previously ranked signal dropped out of the current recent window."}
            </p>
          </div>
        </div>
      </Surface>

      {sourceStatuses.length > 0 ? (
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Official source health"
            title="What this run fetched"
            description="Each source card shows whether the official ingestion succeeded before the draft brief moved into review."
          />
          <SourceStatusGrid sourceStatuses={sourceStatuses} />
        </Surface>
      ) : null}

      <Surface className="p-6">
        <SectionHeading
          eyebrow="Run review assistant"
          title="Ask this run"
          description="Query only the evidence captured during this official-source run. The assistant answers from run-scoped citations instead of the wider web."
        />
        <div className="mt-6">
          <RunQuestionAssistant
            runId={run.runId}
            evidenceCount={run.evidence.length}
            llmConfigured={llmConfigured}
            suggestedQuestions={suggestedQuestions}
          />
        </div>
      </Surface>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Draft weekly brief"
            title="Reviewable output"
            description="This is the draft brief generated from the official-source ingestion run."
          />
          <div className="mt-6 space-y-4">
            {run.weeklyInsight ? (
              <>
                {run.weeklyInsight.signals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-[22px] border border-border/70 bg-panel px-4 py-4 text-sm leading-6 text-panel-foreground"
                  >
                    {signal}
                  </div>
                ))}
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-panel px-4 py-5 text-sm leading-6 text-muted-foreground">
                This run did not produce a reviewable weekly brief.
              </div>
            )}
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Ranked signals"
            title="Top updates in this run"
            description="These updates were normalized, classified, ranked, and then used to draft the run summary."
          />
          <div className="mt-6 space-y-3">
            {run.updates.length > 0 ? (
              run.updates.slice(0, 6).map((update) => (
                <div
                  key={update.id}
                  className="rounded-[22px] border border-border/70 bg-panel px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{update.product}</Badge>
                    <Badge>{update.category}</Badge>
                  </div>
                  <p className="mt-3 text-base font-semibold text-foreground">{update.title}</p>
                  <p className="mt-2 text-sm leading-6 text-panel-foreground">
                    {update.excerpt}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatShortDate(update.publishedAt)} / Score {update.score}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-panel px-4 py-5 text-sm leading-6 text-muted-foreground">
                No ranked signals were captured for this run.
              </div>
            )}
          </div>
        </Surface>
      </section>
    </div>
  );
}
