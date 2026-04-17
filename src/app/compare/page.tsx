import type { Metadata } from "next";

import { Badge } from "@/components/shared/badge";
import { FrequencyChart } from "@/components/shared/frequency-chart";
import { DatasetModeCallout } from "@/components/shared/dataset-mode-callout";
import { PublishedModeEmptyState } from "@/components/shared/published-mode-empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { SourceStatusPanel } from "@/components/shared/source-status-panel";
import { Surface } from "@/components/shared/surface";
import { CompareControls } from "@/components/compare/compare-controls";
import {
  getAvailableProducts,
  getComparisonViewData,
} from "@/lib/intelligence/builders";
import { CATEGORY_META } from "@/lib/intelligence/constants";
import { parseIntelligenceMode } from "@/lib/intelligence/runtime";

export const metadata: Metadata = {
  title: "Compare products",
  description:
    "Benchmark AI products across update cadence, feature categories, product direction, and pillar focus in one decision-ready view.",
};

function focusLabel(score: number) {
  if (score >= 10) {
    return "High";
  }

  if (score >= 5) {
    return "Medium";
  }

  return "Low";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ products?: string; mode?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedSlugs = resolvedSearchParams.products?.split(",").filter(Boolean);
  const mode = parseIntelligenceMode(resolvedSearchParams.mode);
  const { data: comparison, runtime } = await getComparisonViewData(requestedSlugs, {
    mode,
  });

  if (runtime.requestedMode === "published" && runtime.publishedAvailable === false) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <Surface className="p-8">
          <div className="space-y-4">
            <DatasetModeCallout runtime={runtime} />
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Compare 2 to 3 products</Badge>
              <Badge>Published mode needs a reviewed run first</Badge>
            </div>
          </div>
        </Surface>
        <PublishedModeEmptyState
          runtime={runtime}
          title="Published comparisons appear after a reviewed run is approved."
          description="The compare workspace only reads the latest review-approved research run. Execute an official ingestion, review the draft, and publish it to unlock a stable comparison snapshot here."
        />
      </div>
    );
  }

  const availableProducts = getAvailableProducts();
  const selectedNames = comparison.selectedProducts.map((product) => product.name).join(", ");
  const totalSignals = comparison.cards.reduce(
    (sum, card) => sum + card.updateFrequency,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
      <Surface className="p-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <DatasetModeCallout runtime={runtime} />
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Compare 2 to 3 products</Badge>
              <Badge>Read cadence, category mix, direction, and focus pillars</Badge>
            </div>
          </div>
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Benchmark AI product direction inside one decision-ready view.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              Compare a focused product set to see who is shipping most often,
              which themes dominate recent motion, and where each team is placing
              its strategic emphasis.
            </p>
          </div>
          <CompareControls
            products={availableProducts}
            selectedSlugs={comparison.selectedProducts.map((product) => product.slug)}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Current set
              </p>
              <p className="mt-3 text-base font-semibold text-foreground">{selectedNames}</p>
              <p className="mt-2 text-sm leading-6 text-panel-foreground">
                The view is tuned for fast competitive reading rather than a long-form teardown.
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Signal coverage
              </p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{totalSignals}</p>
              <p className="mt-2 text-sm leading-6 text-panel-foreground">
                Combined tracked updates across the selected products.
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Readout
              </p>
              <p className="mt-3 text-sm leading-6 text-panel-foreground">
                {comparison.directionSummary}
              </p>
            </div>
          </div>
        </div>
      </Surface>

      <SourceStatusPanel runtime={runtime} />

      <section className="grid gap-6 lg:grid-cols-3">
        {comparison.cards.map((card) => {
          const product = comparison.selectedProducts.find((item) => item.slug === card.slug)!;

          return (
            <Surface key={card.slug} className="p-6">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: product.accent }}
                />
                <h2 className="text-xl font-semibold text-foreground">{card.name}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{card.pricingModel}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-border/70 bg-panel px-4 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Update frequency
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {card.updateFrequency}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-panel px-4 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Momentum
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {card.momentumScore}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {card.dominantCategories.map((category) => (
                  <Badge key={category}>{CATEGORY_META[category].label}</Badge>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-panel-foreground">
                {card.productDirection}
              </p>
            </Surface>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Update frequency"
            title="How often each product is moving"
            description="Six weekly windows make it easy to see who is keeping up a steady cadence and who spikes around bigger releases."
          />
          <div className="mt-6">
            <FrequencyChart
              data={comparison.frequencySeries}
              series={comparison.selectedProducts.map((product) => ({
                dataKey: product.slug,
                name: product.name,
                color: product.accent,
              }))}
            />
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Direction"
            title="Interpretation"
            description={comparison.directionSummary}
          />
          <div className="mt-6 space-y-3">
            {comparison.cards.map((card) => (
              <div
                key={`direction-${card.slug}`}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4 text-sm leading-6 text-panel-foreground"
              >
                <span className="font-semibold text-foreground">{card.name}:</span>{" "}
                {card.productDirection}
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-6">
          <SectionHeading
            eyebrow="Feature categories"
            title="Category matrix"
            description="Counts reflect how much each product is signaling within a given theme. On smaller screens, this matrix scrolls horizontally."
          />
          <div className="mt-6 overflow-x-auto rounded-[24px] border border-border/70">
            <table className="min-w-[620px] divide-y divide-border/70 text-sm">
              <thead className="bg-panel">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Category
                  </th>
                  {comparison.selectedProducts.map((product) => (
                    <th
                      key={product.slug}
                      className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-surface">
                {comparison.categoryMatrix.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    {comparison.selectedProducts.map((product) => (
                      <td
                        key={`${row.category}-${product.slug}`}
                        className="px-4 py-3 text-panel-foreground"
                      >
                        {row[product.slug]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface className="p-6">
          <SectionHeading
            eyebrow="Pillar focus"
            title="Pricing, workflow, agent, memory, and search focus"
            description="Scores weight category-specific importance, not just raw counts."
          />
          <div className="mt-6 space-y-3">
            {comparison.focusMatrix.map((row) => (
              <div
                key={row.pillar}
                className="rounded-[22px] border border-border/70 bg-panel px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">{row.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {comparison.selectedProducts.map((product) => {
                      const score = Number(row[product.slug]);
                      return (
                        <div
                          key={`${row.pillar}-${product.slug}`}
                          className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-panel-foreground"
                        >
                          <span className="font-medium text-foreground">{product.name}</span>:{" "}
                          {focusLabel(score)} ({score})
                        </div>
                      );
                    })}
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
