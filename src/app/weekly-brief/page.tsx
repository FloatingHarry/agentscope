import type { Metadata } from "next";

import { Badge } from "@/components/shared/badge";
import { DatasetModeCallout } from "@/components/shared/dataset-mode-callout";
import { PublishedModeEmptyState } from "@/components/shared/published-mode-empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SourceStatusPanel } from "@/components/shared/source-status-panel";
import { Surface } from "@/components/shared/surface";
import { TrendChart } from "@/components/shared/trend-chart";
import { getWeekLabel, getWeeklyBriefViewData } from "@/lib/intelligence/builders";
import { CATEGORY_META } from "@/lib/intelligence/constants";
import { parseIntelligenceMode } from "@/lib/intelligence/runtime";
import { formatShortDate, toPercent } from "@/lib/intelligence/utils";

export const metadata: Metadata = {
  title: "Weekly brief",
  description:
    "A concise weekly intelligence readout on AI product movement, major trend directions, and the products worth watching next.",
};

export default async function WeeklyBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const mode = parseIntelligenceMode(resolvedSearchParams.mode);
  const { data: weeklyBrief, runtime } = await getWeeklyBriefViewData({ mode });

  if (runtime.requestedMode === "published" && runtime.publishedAvailable === false) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <Surface className="p-8">
          <div className="space-y-4">
            <DatasetModeCallout runtime={runtime} />
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Weekly brief</Badge>
              <Badge>Published mode needs a reviewed run first</Badge>
            </div>
          </div>
        </Surface>
        <PublishedModeEmptyState
          runtime={runtime}
          title="No published weekly brief is available yet."
          description="Run Center will generate a draft weekly brief from official sources, but this page only reads the latest run after you review and publish it."
        />
      </div>
    );
  }

  const leadCategory = weeklyBrief.categoryOverview[0];
  const runnerUpCategory = weeklyBrief.categoryOverview[1];
  const watchlistNames = weeklyBrief.watchlist
    .slice(0, 3)
    .map((product) => product.name)
    .join(", ");
  const supportingProducts = weeklyBrief.insight.topProducts.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <Surface className="p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <DatasetModeCallout runtime={runtime} />
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Weekly brief</Badge>
              <Badge>{getWeekLabel(runtime.generatedAt)}</Badge>
            </div>
          </div>
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              {weeklyBrief.insight.headline}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              {weeklyBrief.insight.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {weeklyBrief.insight.topProducts.map((product) => (
              <Badge key={product} tone="signal">
                {product}
              </Badge>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                What happened
              </p>
              <p className="mt-3 text-sm leading-6 text-panel-foreground">
                {weeklyBrief.notableSignals.length} ranked signals surfaced this week, led by{" "}
                {weeklyBrief.insight.topProducts[0] ?? "the current tracked set"}
                {supportingProducts.length > 0
                  ? ` and supported by ${supportingProducts.join(" and ")}`
                  : ""}
                .
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Why it matters
              </p>
              <p className="mt-3 text-sm leading-6 text-panel-foreground">
                {leadCategory.label} and {runnerUpCategory.label.toLowerCase()} together
                account for {toPercent(leadCategory.share + runnerUpCategory.share)} of tracked
                product movement.
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Who to watch
              </p>
              <p className="mt-3 text-sm leading-6 text-panel-foreground">
                Keep an eye on {watchlistNames || "the current watchlist"} as the
                highest-momentum products in the current brief.
              </p>
            </div>
          </div>
        </div>
      </Surface>

      <SourceStatusPanel runtime={runtime} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Top signals"
            title="What happened this week"
            description="These are the concrete product moves most likely to matter in a strategy readout."
          />
          <div className="mt-6 space-y-3">
            {weeklyBrief.notableSignals.length > 0 ? (
              weeklyBrief.notableSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-[22px] border border-border/70 bg-panel px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{signal.product}</Badge>
                    <Badge>{CATEGORY_META[signal.category].label}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-panel-foreground">
                    {signal.excerpt}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatShortDate(signal.publishedAt)} / Score {signal.score}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-panel px-4 py-5 text-sm leading-6 text-muted-foreground">
                No live signals are available yet in this window, so the brief is waiting on
                the next tracked update batch.
              </div>
            )}
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Major trend directions"
            title="Why it matters"
            description="The strongest categories explain where vendors are stacking more product energy across the market."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {weeklyBrief.categoryOverview.slice(0, 3).map((item) => (
              <div
                key={item.category}
                className="rounded-[24px] border border-border/70 bg-panel px-5 py-5"
              >
                <Badge>{item.label}</Badge>
                <p className="mt-4 text-3xl font-semibold text-foreground">{item.count}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {toPercent(item.share)} share of total movement
                </p>
                <p className="mt-4 text-sm leading-6 text-panel-foreground">
                  {CATEGORY_META[item.category].description}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Six-week context"
            title="Trendline behind the weekly brief"
            description="The brief is still grounded in the same multi-week category trend data used across the dashboard."
          />
          <div className="mt-6">
            <TrendChart
              data={weeklyBrief.trendSeries}
              series={[
                {
                  dataKey: "workflow",
                  name: "Workflow",
                  color: CATEGORY_META.workflow.chartColor,
                },
                {
                  dataKey: "agent",
                  name: "Agent",
                  color: CATEGORY_META.agent.chartColor,
                },
                {
                  dataKey: "memory",
                  name: "Memory",
                  color: CATEGORY_META.memory.chartColor,
                },
              ]}
            />
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Watchlist"
            title="Who to watch next"
            description="This watchlist surfaces the products with the strongest recent momentum and the clearest follow-up value."
          />
          <div className="mt-6 space-y-3">
            {weeklyBrief.watchlist.map((product) => (
              <div
                key={product.slug}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">{product.name}</p>
                  <Badge>{CATEGORY_META[product.strongestCategory].label}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-panel-foreground">
                  {product.recentFocus}
                </p>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{product.totalUpdates} tracked updates</span>
                  <span>Momentum {product.momentumScore}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}
