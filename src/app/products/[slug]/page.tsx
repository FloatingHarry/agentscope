import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/shared/badge";
import { CategoryBarChart } from "@/components/shared/category-bar-chart";
import { DatasetModeCallout } from "@/components/shared/dataset-mode-callout";
import { PublishedModeEmptyState } from "@/components/shared/published-mode-empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SourceStatusPanel } from "@/components/shared/source-status-panel";
import { Surface } from "@/components/shared/surface";
import {
  getAvailableProducts,
  getAvailableProductSlugs,
  getProductInsight,
  getProductViewData,
} from "@/lib/intelligence/builders";
import { CATEGORY_META } from "@/lib/intelligence/constants";
import { buildModeHref, parseIntelligenceMode } from "@/lib/intelligence/runtime";
import { formatLongDate, toPercent } from "@/lib/intelligence/utils";

export function generateStaticParams() {
  return getAvailableProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const insight = await getProductInsight(slug);

  if (!insight) {
    return {};
  }

  return {
    title: `${insight.product.name} | AI Product Intelligence Agent`,
    description: insight.directionSummary,
    alternates: {
      canonical: `/products/${insight.product.slug}`,
    },
    openGraph: {
      title: `${insight.product.name} | AI Product Intelligence Agent`,
      description: insight.directionSummary,
      url: `/products/${insight.product.slug}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = parseIntelligenceMode(resolvedSearchParams.mode);
  const { data: insight, runtime } = await getProductViewData(slug, { mode });

  if (!insight) {
    notFound();
  }

  if (runtime.requestedMode === "published" && runtime.publishedAvailable === false) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <Surface className="p-8">
          <div className="space-y-5">
            <DatasetModeCallout runtime={runtime} />
            <Link
              href={buildModeHref("/", runtime.requestedMode)}
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal"
            >
              Dashboard / Product Detail
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {insight.product.name}
                </h1>
                <Badge tone="accent">{insight.product.company}</Badge>
                <Badge>{insight.product.segment}</Badge>
              </div>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {insight.product.description}
              </p>
            </div>
          </div>
        </Surface>
        <PublishedModeEmptyState
          runtime={runtime}
          title={`No published research run includes ${insight.product.name} yet.`}
          description="Product detail in published mode is reserved for the latest review-approved run. Open Run Center, complete an official ingestion, and publish the reviewed draft to make this page available."
        />
      </div>
    );
  }

  const comparePeers = getAvailableProducts()
    .map((product) => product.slug)
    .filter((candidate) => candidate !== slug)
    .slice(0, 2);
  const compareHref = buildModeHref(
    `/compare?products=${[slug, ...comparePeers].join(",")}`,
    runtime.requestedMode,
  );

  const categoryChartData = insight.categoryDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      label: item.label,
      value: item.count,
      color: CATEGORY_META[item.category].chartColor,
    }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <Surface className="p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-5">
            <DatasetModeCallout runtime={runtime} />
            <Link
              href={buildModeHref("/", runtime.requestedMode)}
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal"
            >
              Dashboard / Product Detail
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {insight.product.name}
                </h1>
                <Badge tone="accent">{insight.product.company}</Badge>
                <Badge>{insight.product.segment}</Badge>
              </div>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {insight.product.description}
              </p>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-panel-foreground">
              {insight.directionSummary}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={buildModeHref("/", runtime.requestedMode)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground"
              >
                Back to dashboard
              </Link>
              <Link
                href={compareHref}
                className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-4 py-2 text-sm font-medium text-teal transition-colors hover:bg-surface hover:border-teal/20"
              >
                Compare with peers
              </Link>
              <Link
                href={buildModeHref("/weekly-brief", runtime.requestedMode)}
                className="rounded-full border border-border bg-panel px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground"
              >
                Open weekly brief
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-border/70 bg-panel px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Momentum
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {insight.momentumScore}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-panel px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Updates
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {insight.timeline.length}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-panel px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Pricing
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">
                {insight.product.pricingModel}
              </p>
            </div>
          </div>
        </div>
      </Surface>

      <SourceStatusPanel runtime={runtime} />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Recent focus"
            title="What this product is optimizing for right now"
            description={insight.recentFocus}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {insight.recentSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4 text-sm leading-6 text-panel-foreground"
              >
                {signal}
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Category mix"
            title="Distribution of product movement"
            description="Category counts are derived from the normalized and classified update timeline."
          />
          <div className="mt-6">
            {categoryChartData.length > 0 ? (
              <CategoryBarChart data={categoryChartData} height={320} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-panel px-5 py-8 text-sm leading-6 text-muted-foreground">
                No categorized signals are available yet for this product in the current data
                mode.
              </div>
            )}
          </div>
        </Surface>
      </section>

      <Surface className="p-6">
        <SectionHeading
          eyebrow="Timeline"
          title="Update timeline"
          description="A product-specific read of releases, pricing shifts, and focus changes."
        />
        <div className="mt-6 space-y-4">
          {insight.timeline.length > 0 ? (
            insight.timeline.map((update) => (
              <div
                key={update.id}
                className="rounded-[24px] border border-border/70 bg-panel px-5 py-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{CATEGORY_META[update.category].label}</Badge>
                  <Badge>{update.changeType}</Badge>
                  <Badge>{update.recencyBucket.replaceAll("-", " ")}</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <h2 className="text-lg font-semibold text-foreground">{update.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-panel-foreground">
                      {update.excerpt}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[20px] border border-border/70 bg-surface px-4 py-3 text-sm text-muted-foreground">
                    <p>{formatLongDate(update.publishedAt)}</p>
                    <p className="mt-1">Score {update.score}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {update.signalPhrases.map((signal) => (
                    <Badge key={signal}>{signal}</Badge>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-panel px-5 py-6 text-sm leading-6 text-muted-foreground">
              No timeline entries are available for this product in the current data mode.
            </div>
          )}
        </div>
        <div className="mt-6 rounded-[24px] border border-border/70 bg-surface px-5 py-5 text-sm leading-6 text-muted-foreground">
          The strongest category for {insight.product.name} is{" "}
          {CATEGORY_META[insight.categoryDistribution[0].category].label.toLowerCase()}, with{" "}
          {toPercent(insight.categoryDistribution[0].share)} of this product&apos;s tracked
          activity landing there.
        </div>
      </Surface>
    </div>
  );
}
