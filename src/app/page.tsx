import type { Metadata } from "next";

import Link from "next/link";

import { Badge } from "@/components/shared/badge";
import { DatasetModeCallout } from "@/components/shared/dataset-mode-callout";
import { CategoryBarChart } from "@/components/shared/category-bar-chart";
import { PublishedModeEmptyState } from "@/components/shared/published-mode-empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SourceStatusPanel } from "@/components/shared/source-status-panel";
import { StatCard } from "@/components/shared/stat-card";
import { Surface } from "@/components/shared/surface";
import { TrendChart } from "@/components/shared/trend-chart";
import { getDashboardViewData } from "@/lib/intelligence/builders";
import { CATEGORY_META } from "@/lib/intelligence/constants";
import { buildModeHref, parseIntelligenceMode } from "@/lib/intelligence/runtime";
import { formatShortDate, toPercent } from "@/lib/intelligence/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Competitive intelligence dashboard for reading AI product movement, tracking category momentum, and spotting the products worth watching this week.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const mode = parseIntelligenceMode(resolvedSearchParams.mode);
  const { data: dashboard, runtime } = await getDashboardViewData({ mode });

  if (runtime.requestedMode === "published" && runtime.publishedAvailable === false) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <Surface className="p-8">
          <div className="space-y-4">
            <DatasetModeCallout runtime={runtime} />
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Research Run Agent</Badge>
              <Badge>Publish a reviewed run to unlock this mode</Badge>
            </div>
          </div>
        </Surface>
        <PublishedModeEmptyState
          runtime={runtime}
          title="Published mode is waiting for its first approved research run."
          description="Once Run Center completes an official-source ingestion and you publish the reviewed draft, this dashboard will read that approved snapshot instead of the raw live preview."
        />
      </div>
    );
  }

  const leadingCategory = dashboard.categoryOverview[0];
  const categoryChartData = dashboard.categoryOverview.map((item) => ({
    label: item.label,
    value: item.count,
    color: CATEGORY_META[item.category].chartColor,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Surface className="relative overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,163,154,0.15),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.55),transparent_60%)]" />
          <div className="relative flex flex-col gap-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="accent">Research agent pipeline</Badge>
                <Badge>Normalize, classify, rank, summarize</Badge>
              </div>
              <DatasetModeCallout runtime={runtime} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div className="space-y-5">
                <div className="space-y-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    Dashboard
                  </p>
                  <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                    AI product movement, ranked and summarized for strategy teams.
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                    Read where leading AI products are shipping, where category
                    momentum is clustering, and which competitors are setting the
                    pace across the market this week.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={buildModeHref("/compare", runtime.requestedMode)}
                    className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-medium text-teal transition-colors hover:bg-surface hover:border-teal/20"
                  >
                    Compare products
                  </Link>
                  <Link
                    href={buildModeHref("/weekly-brief", runtime.requestedMode)}
                    className="rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground transition-colors hover:border-foreground"
                  >
                    Open weekly brief
                  </Link>
                  <Link
                    href={buildModeHref("/api/intelligence", runtime.requestedMode)}
                    className="rounded-full border border-border bg-transparent px-5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View homepage API payload
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard
                  label="Tracked products"
                  value={String(dashboard.trackedProducts.length)}
                  hint="Coverage spans research assistants, coding products, and workspace AI."
                />
                <StatCard
                  label="Top category"
                  value={leadingCategory.label}
                  hint={`${toPercent(leadingCategory.share)} of current tracked product movement is classified here.`}
                />
              </div>
            </div>
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Weekly pulse"
            title={dashboard.weeklyInsight.headline}
            description={dashboard.weeklyInsight.summary}
          />
          <div className="mt-6 space-y-4">
            {dashboard.weeklyInsight.signals.map((signal) => (
              <div
                key={signal}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4 text-sm leading-6 text-panel-foreground"
              >
                {signal}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {dashboard.weeklyInsight.topProducts.map((product) => (
              <Badge key={product} tone="signal">
                {product}
              </Badge>
            ))}
          </div>
        </Surface>
      </section>

      <SourceStatusPanel runtime={runtime} />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Coverage"
            title="Tracked AI products"
            description="Each card is derived from the intelligence pipeline so the dashboard reads like a product surface, not a static mockup."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dashboard.trackedProducts.map((product) => (
              <Link
                key={product.slug}
                href={buildModeHref(`/products/${product.slug}`, runtime.requestedMode)}
                className="group rounded-[24px] border border-border/70 bg-panel p-5 transition-transform hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.pricingModel}
                    </p>
                  </div>
                  <Badge>{CATEGORY_META[product.strongestCategory].label}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-panel-foreground">
                  {product.recentFocus}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{product.totalUpdates} updates</span>
                  <span>Momentum {product.momentumScore}</span>
                </div>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Who moved most"
            title="Products worth watching"
            description="Momentum combines importance, category emphasis, and recency into one watchlist-oriented signal."
          />
          <div className="mt-6 space-y-3">
            {dashboard.topMovers.map((product, index) => (
              <div
                key={product.slug}
                className="flex items-start gap-4 rounded-[22px] border border-border/70 bg-panel px-4 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-white">
                  0{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">{product.name}</p>
                  <p className="mt-1 text-sm leading-6 text-panel-foreground">
                    {product.recentFocus}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Last update {formatShortDate(product.lastUpdated)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Category trend"
            title="Workflow, agent, and search moves lead the last 6 weeks"
            description="The chart shows how the market narrative shifts once raw product updates are normalized, classified, and ranked."
          />
          <div className="mt-6">
            <TrendChart
              data={dashboard.trendSeries}
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
                  dataKey: "search",
                  name: "Search",
                  color: CATEGORY_META.search.chartColor,
                },
              ]}
            />
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Distribution"
            title="Category overview"
            description="A compact read on which product themes dominate the tracked market."
          />
          <div className="mt-6">
            <CategoryBarChart data={categoryChartData} height={320} />
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Recent events"
            title="High-signal product updates"
            description="These are the strongest recent moves after recency, importance, and category emphasis have all been applied."
          />
          <div className="mt-6 space-y-4">
            {dashboard.recentUpdates.map((update) => (
              <div
                key={update.id}
                className="rounded-[24px] border border-border/70 bg-panel px-5 py-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{update.product}</Badge>
                  <Badge>{CATEGORY_META[update.category].label}</Badge>
                  <Badge>{update.changeType}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {update.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-panel-foreground">
                  {update.excerpt}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span>{formatShortDate(update.publishedAt)}</span>
                  <span>Score {update.score}</span>
                  <span>{update.source}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Category signal table"
            title="Where the market is concentrating"
            description="Weekly deltas highlight which themes accelerated compared with the previous seven-day window."
          />
          <div className="mt-6 space-y-3">
            {dashboard.categoryOverview.map((item) => (
              <div
                key={item.category}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {toPercent(item.share)} share of tracked product movement
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">{item.count}</p>
                    <p
                      className={`text-sm ${
                        item.weekDelta >= 0 ? "text-teal" : "text-amber-700"
                      }`}
                    >
                      {item.weekDelta >= 0 ? "+" : ""}
                      {item.weekDelta} vs prior week
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}
