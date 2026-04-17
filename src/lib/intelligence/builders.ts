import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_COMPARE_PRODUCT_SLUGS,
  FOCUS_PILLARS,
  TRACKED_PRODUCTS,
} from "@/lib/intelligence/constants";
import {
  CuratedJsonIntelligenceProvider,
  OfficialSourceIntelligenceProvider,
} from "@/lib/intelligence/live-provider";
import { mockProvider } from "@/lib/intelligence/mock-provider";
import { getLatestPublishedRun } from "@/lib/intelligence/run-store";
import {
  buildComparisonDirection,
  buildProductSnapshot,
  calculateFocusScores,
  generateWeeklyInsight,
  summarizeProductDirection,
  summarizeRecentFocus,
} from "@/lib/intelligence/summary-generator";
import {
  type IntelligenceMode,
  type IntelligenceRuntimeMeta,
  resolveReferenceDate,
} from "@/lib/intelligence/runtime";
import type {
  CategoryOverviewItem,
  CategoryMatrixRow,
  ComparisonCard,
  ComparisonSnapshot,
  DashboardPayload,
  FrequencyPoint,
  FocusMatrixRow,
  ProductInsight,
  RankedUpdate,
  TrackedProduct,
  TrendPoint,
  WeeklyBriefData,
} from "@/lib/intelligence/types";
import { normalizeRawUpdates } from "@/lib/intelligence/update-normalizer";
import { rankUpdates } from "@/lib/intelligence/update-ranker";
import { classifyUpdates } from "@/lib/intelligence/update-classifier";
import { daysBetween, formatLongDate, formatShortDate } from "@/lib/intelligence/utils";

type BuilderOptions = {
  mode?: IntelligenceMode;
  liveUpdatesUrl?: string;
  fetchImpl?: typeof fetch;
};

type BuilderContext = {
  products: TrackedProduct[];
  updates: RankedUpdate[];
  runtime: IntelligenceRuntimeMeta;
};

type PageData<T> = {
  data: T;
  runtime: IntelligenceRuntimeMeta;
};

function buildContext(
  products: TrackedProduct[],
  updates: RankedUpdate[],
  runtime: IntelligenceRuntimeMeta,
): BuilderContext {
  return {
    products,
    updates,
    runtime,
  };
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "the live feed was unavailable";
}

function resolveCuratedOverrideUrl(options?: BuilderOptions) {
  return options?.liveUpdatesUrl?.trim() || undefined;
}

async function loadPublishedDataset(): Promise<BuilderContext> {
  const publishedRun = await getLatestPublishedRun();

  if (!publishedRun) {
    const referenceDate = resolveReferenceDate("published");

    return buildContext(TRACKED_PRODUCTS, [], {
      requestedMode: "published",
      resolvedMode: "published",
      fallbackReason: "No published research run is available yet.",
      generatedAt: referenceDate.toISOString(),
      referenceDate,
      sourceName: "published-run-store",
      sourceVariant: "published-run",
      publishedAvailable: false,
    });
  }

  return buildContext(publishedRun.products, publishedRun.updates, {
    requestedMode: "published",
    resolvedMode: "published",
    generatedAt: publishedRun.runtime.generatedAt,
    referenceDate: new Date(publishedRun.runtime.referenceDate),
    sourceName: "published-run-store",
    sourceVariant: "published-run",
    sourceAttemptCount: publishedRun.runtime.sourceAttemptCount,
    sourceSuccessCount: publishedRun.runtime.sourceSuccessCount,
    activeSourceLabels: publishedRun.runtime.activeSourceLabels,
    sourceFailureDetails: publishedRun.runtime.sourceFailureDetails,
    sourceStatuses: publishedRun.runtime.sourceStatuses,
    publishedAvailable: true,
    publishedRunId: publishedRun.runId,
    publishedUpdatedAt: publishedRun.updatedAt,
    publishedHeadline: publishedRun.weeklyInsight?.headline,
  });
}

async function loadDataset(
  mode: IntelligenceMode,
  options?: BuilderOptions,
): Promise<BuilderContext> {
  if (mode === "published") {
    return loadPublishedDataset();
  }

  const liveUpdatesUrl = resolveCuratedOverrideUrl(options);
  const liveProvider =
    mode === "live"
      ? liveUpdatesUrl
        ? new CuratedJsonIntelligenceProvider(liveUpdatesUrl, options?.fetchImpl)
        : new OfficialSourceIntelligenceProvider(options?.fetchImpl)
      : null;

  let provider = liveProvider ?? mockProvider;
  let resolvedMode: IntelligenceMode =
    liveProvider && mode === "live" ? "live" : "mock";
  let fallbackReason: string | undefined;

  const attemptLoad = async () => {
    const products = await provider.getProducts();
    const preparedUpdates = normalizeRawUpdates(await provider.getRawUpdates(), products);
    const normalizedUpdates = classifyUpdates(preparedUpdates);
    const referenceDate = resolveReferenceDate(resolvedMode);
    const updates = rankUpdates(normalizedUpdates, referenceDate);

    return {
      products,
      updates,
      referenceDate,
    };
  };

  try {
    const dataset = await attemptLoad();

    return {
      products: dataset.products,
      updates: dataset.updates,
      runtime: {
        requestedMode: mode,
        resolvedMode,
        fallbackReason,
        generatedAt: dataset.referenceDate.toISOString(),
        referenceDate: dataset.referenceDate,
        sourceName: provider.name,
        sourceVariant:
          provider instanceof CuratedJsonIntelligenceProvider
            ? "curated-json"
            : provider instanceof OfficialSourceIntelligenceProvider
              ? "official-sources"
              : "mock",
        sourceAttemptCount:
          provider instanceof OfficialSourceIntelligenceProvider
            ? provider.getSummary().attempted
            : provider instanceof CuratedJsonIntelligenceProvider
              ? 1
              : undefined,
        sourceSuccessCount:
          provider instanceof OfficialSourceIntelligenceProvider
            ? provider.getSummary().succeeded
            : provider instanceof CuratedJsonIntelligenceProvider
              ? 1
              : undefined,
        activeSourceLabels:
          provider instanceof OfficialSourceIntelligenceProvider
            ? provider.getSummary().activeSources
            : provider instanceof CuratedJsonIntelligenceProvider
              ? ["Curated JSON feed"]
              : undefined,
        sourceFailureDetails:
          provider instanceof OfficialSourceIntelligenceProvider
            ? provider.getSummary().failedSources
            : undefined,
        sourceStatuses:
          provider instanceof OfficialSourceIntelligenceProvider
            ? provider.getSummary().sourceStatuses
            : undefined,
      },
    };
  } catch (error) {
    if (mode !== "live") {
      throw error;
    }

    const failedOfficialSummary =
      provider instanceof OfficialSourceIntelligenceProvider ? provider.getSummary() : undefined;

    provider = mockProvider;
    resolvedMode = "mock";
    fallbackReason = toErrorMessage(error);

    const dataset = await (async () => {
      const products = await provider.getProducts();
      const preparedUpdates = normalizeRawUpdates(await provider.getRawUpdates(), products);
      const normalizedUpdates = classifyUpdates(preparedUpdates);
      const referenceDate = resolveReferenceDate("mock");
      const updates = rankUpdates(normalizedUpdates, referenceDate);

      return {
        products,
        updates,
        referenceDate,
      };
    })();

    return {
      products: dataset.products,
      updates: dataset.updates,
      runtime: {
        requestedMode: mode,
        resolvedMode,
        fallbackReason,
        generatedAt: dataset.referenceDate.toISOString(),
        referenceDate: dataset.referenceDate,
        sourceName: provider.name,
        sourceVariant: "mock",
        sourceAttemptCount: failedOfficialSummary?.attempted,
        sourceSuccessCount: failedOfficialSummary?.succeeded,
        activeSourceLabels: failedOfficialSummary?.activeSources,
        sourceFailureDetails: failedOfficialSummary?.failedSources,
        sourceStatuses: failedOfficialSummary?.sourceStatuses,
      },
    };
  }
}

function getProductBySlug(products: TrackedProduct[], slug: string) {
  return products.find((product) => product.slug === slug);
}

function getUpdatesForProduct(updates: RankedUpdate[], slug: string) {
  return updates.filter((update) => update.productSlug === slug);
}

function buildCategoryOverview(
  updates: RankedUpdate[],
  referenceDate: Date,
): CategoryOverviewItem[] {
  const currentWindow = updates.filter(
    (update) => daysBetween(referenceDate, new Date(update.publishedAt)) <= 7,
  );
  const priorWindow = updates.filter((update) => {
    const age = daysBetween(referenceDate, new Date(update.publishedAt));
    return age > 7 && age <= 14;
  });

  const total = updates.length || 1;

  return CATEGORY_ORDER.map((category) => {
    const count = updates.filter((update) => update.category === category).length;
    const current = currentWindow.filter((update) => update.category === category).length;
    const previous = priorWindow.filter((update) => update.category === category).length;

    return {
      category,
      label: CATEGORY_META[category].label,
      count,
      share: (count / total) * 100,
      weekDelta: current - previous,
    };
  }).sort((left, right) => right.count - left.count);
}

function trailingWeekStarts(referenceDate: Date, weeks = 6) {
  const starts: Date[] = [];

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const start = new Date(referenceDate);
    start.setUTCDate(start.getUTCDate() - offset * 7);
    starts.push(start);
  }

  return starts;
}

function buildTrendSeries(updates: RankedUpdate[], referenceDate: Date): TrendPoint[] {
  return trailingWeekStarts(referenceDate).map((weekStart, index, starts) => {
    const nextWeekStart = starts[index + 1];
    const weekUpdates = updates.filter((update) => {
      const publishedAt = new Date(update.publishedAt);
      return nextWeekStart
        ? publishedAt >= weekStart && publishedAt < nextWeekStart
        : publishedAt >= weekStart && publishedAt <= referenceDate;
    });

    return {
      weekLabel: formatShortDate(weekStart),
      weekStart: weekStart.toISOString(),
      total: weekUpdates.length,
      agent: weekUpdates.filter((update) => update.category === "agent").length,
      search: weekUpdates.filter((update) => update.category === "search").length,
      memory: weekUpdates.filter((update) => update.category === "memory").length,
      workflow: weekUpdates.filter((update) => update.category === "workflow").length,
      collaboration: weekUpdates.filter((update) => update.category === "collaboration").length,
      pricing: weekUpdates.filter((update) => update.category === "pricing").length,
      "developer-tools": weekUpdates.filter(
        (update) => update.category === "developer-tools",
      ).length,
    };
  });
}

function buildFrequencySeries(
  updates: RankedUpdate[],
  selectedSlugs: string[],
  referenceDate: Date,
): FrequencyPoint[] {
  return trailingWeekStarts(referenceDate).map((weekStart, index, starts) => {
    const nextWeekStart = starts[index + 1];
    const row: FrequencyPoint = {
      weekLabel: formatShortDate(weekStart),
      weekStart: weekStart.toISOString(),
    };

    for (const slug of selectedSlugs) {
      row[slug] = getUpdatesForProduct(updates, slug).filter((update) => {
        const publishedAt = new Date(update.publishedAt);
        return nextWeekStart
          ? publishedAt >= weekStart && publishedAt < nextWeekStart
          : publishedAt >= weekStart && publishedAt <= referenceDate;
      }).length;
    }

    return row;
  });
}

function pickSelectedSlugs(products: TrackedProduct[], requestedSlugs?: string[]) {
  const available = new Set(products.map((product) => product.slug));
  const deduped = [...new Set((requestedSlugs ?? []).filter((slug) => available.has(slug)))];

  if (deduped.length >= 2) {
    return deduped.slice(0, 3);
  }

  return DEFAULT_COMPARE_PRODUCT_SLUGS;
}

function buildDashboardPayload(context: BuilderContext): DashboardPayload {
  const trackedProducts = context.products
    .map((product) => {
      return buildProductSnapshot(
        product,
        getUpdatesForProduct(context.updates, product.slug),
        context.runtime.referenceDate,
      );
    })
    .sort((left, right) => right.momentumScore - left.momentumScore);

  return {
    trackedProducts,
    recentUpdates: context.updates.slice(0, 8),
    categoryOverview: buildCategoryOverview(context.updates, context.runtime.referenceDate),
    weeklyInsight: generateWeeklyInsight(
      context.updates,
      context.products,
      context.runtime.referenceDate,
    ),
    topMovers: trackedProducts.slice(0, 4),
    trendSeries: buildTrendSeries(context.updates, context.runtime.referenceDate),
    generatedAt: context.runtime.generatedAt,
  };
}

function buildProductInsightPayload(
  context: BuilderContext,
  slug: string,
): ProductInsight | null {
  const product = getProductBySlug(context.products, slug);

  if (!product) {
    return null;
  }

  const timeline = getUpdatesForProduct(context.updates, slug);
  const categoryDistribution = buildCategoryOverview(
    timeline,
    context.runtime.referenceDate,
  );

  return {
    product,
    timeline,
    categoryDistribution,
    recentFocus: summarizeRecentFocus(product, timeline),
    directionSummary: summarizeProductDirection(product, timeline),
    momentumScore: timeline.slice(0, 3).reduce((sum, update) => sum + update.score, 0),
    recentSignals:
      timeline.length > 0
        ? timeline.slice(0, 4).map((update) => {
            return `${formatShortDate(update.publishedAt)}: ${update.featureName}`;
          })
        : [
            `No matching ${context.runtime.resolvedMode} updates are available yet for ${product.name}.`,
          ],
  };
}

function buildComparisonSnapshotPayload(
  context: BuilderContext,
  requestedSlugs?: string[],
): ComparisonSnapshot {
  const selectedSlugs = pickSelectedSlugs(context.products, requestedSlugs);
  const selectedProducts = selectedSlugs
    .map((slug) => getProductBySlug(context.products, slug))
    .filter((product): product is TrackedProduct => Boolean(product));

  const cards: ComparisonCard[] = selectedProducts.map((product) => {
    const updates = getUpdatesForProduct(context.updates, product.slug);
    const categoryCounts = CATEGORY_ORDER.map((category) => ({
      category,
      count: updates.filter((update) => update.category === category).length,
    }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 2)
      .map((entry) => entry.category);

    return {
      slug: product.slug,
      name: product.name,
      updateFrequency: updates.length,
      dominantCategories: categoryCounts,
      productDirection: summarizeProductDirection(product, updates),
      focus: calculateFocusScores(updates),
      momentumScore: updates.slice(0, 3).reduce((sum, update) => sum + update.score, 0),
      pricingModel: product.pricingModel,
    };
  });

  const categoryMatrix: CategoryMatrixRow[] = CATEGORY_ORDER.map((category) => {
    const row: CategoryMatrixRow = {
      category,
      label: CATEGORY_META[category].label,
    };

    for (const product of selectedProducts) {
      row[product.slug] = getUpdatesForProduct(context.updates, product.slug).filter(
        (update) => update.category === category,
      ).length;
    }

    return row;
  });

  const focusMatrix: FocusMatrixRow[] = FOCUS_PILLARS.map((pillar) => {
    const row: FocusMatrixRow = {
      pillar,
      label: CATEGORY_META[pillar].label,
    };

    for (const card of cards) {
      row[card.slug] = card.focus[pillar];
    }

    return row;
  });

  return {
    selectedProducts,
    cards,
    frequencySeries: buildFrequencySeries(
      context.updates,
      selectedSlugs,
      context.runtime.referenceDate,
    ),
    categoryMatrix,
    focusMatrix,
    directionSummary: buildComparisonDirection(cards),
  };
}

function buildWeeklyBriefPayload(context: BuilderContext): WeeklyBriefData {
  const dashboard = buildDashboardPayload(context);

  return {
    insight: dashboard.weeklyInsight,
    trendSeries: dashboard.trendSeries,
    watchlist: dashboard.topMovers,
    notableSignals: dashboard.recentUpdates.slice(0, 6),
    categoryOverview: dashboard.categoryOverview,
  };
}

export function getAvailableProducts() {
  return TRACKED_PRODUCTS;
}

export function getAvailableProductSlugs() {
  return TRACKED_PRODUCTS.map((product) => product.slug);
}

export async function getDashboardPayload(options: BuilderOptions = {}) {
  const context = await loadDataset(options.mode ?? "mock", options);
  return buildDashboardPayload(context);
}

export async function getDashboardViewData(
  options: BuilderOptions = {},
): Promise<PageData<DashboardPayload>> {
  const context = await loadDataset(options.mode ?? "mock", options);
  return {
    data: buildDashboardPayload(context),
    runtime: context.runtime,
  };
}

export async function getProductInsight(
  slug: string,
  options: BuilderOptions = {},
) {
  const context = await loadDataset(options.mode ?? "mock", options);
  return buildProductInsightPayload(context, slug);
}

export async function getProductViewData(
  slug: string,
  options: BuilderOptions = {},
): Promise<PageData<ProductInsight | null>> {
  const context = await loadDataset(options.mode ?? "mock", options);
  return {
    data: buildProductInsightPayload(context, slug),
    runtime: context.runtime,
  };
}

export async function getComparisonSnapshot(
  requestedSlugs?: string[],
  options: BuilderOptions = {},
) {
  const context = await loadDataset(options.mode ?? "mock", options);
  return buildComparisonSnapshotPayload(context, requestedSlugs);
}

export async function getComparisonViewData(
  requestedSlugs?: string[],
  options: BuilderOptions = {},
): Promise<PageData<ComparisonSnapshot>> {
  const context = await loadDataset(options.mode ?? "mock", options);
  return {
    data: buildComparisonSnapshotPayload(context, requestedSlugs),
    runtime: context.runtime,
  };
}

export async function getWeeklyBriefData(options: BuilderOptions = {}) {
  const context = await loadDataset(options.mode ?? "mock", options);
  return buildWeeklyBriefPayload(context);
}

export async function getWeeklyBriefViewData(
  options: BuilderOptions = {},
): Promise<PageData<WeeklyBriefData>> {
  const context = await loadDataset(options.mode ?? "mock", options);
  return {
    data: buildWeeklyBriefPayload(context),
    runtime: context.runtime,
  };
}

export function getWeekLabel(referenceDate: Date | string = new Date()) {
  return `Week ending ${formatLongDate(referenceDate)}`;
}
