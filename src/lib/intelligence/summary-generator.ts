import {
  CATEGORY_META,
  CATEGORY_ORDER,
  FOCUS_PILLARS,
  REFERENCE_DATE,
} from "@/lib/intelligence/constants";
import type {
  ComparisonCard,
  ProductSnapshot,
  RankedUpdate,
  TrackedProduct,
  WeeklyInsight,
} from "@/lib/intelligence/types";
import { daysBetween, sentenceList } from "@/lib/intelligence/utils";

function groupByCategory(updates: RankedUpdate[]) {
  const categoryCount = new Map<string, number>();

  for (const update of updates) {
    categoryCount.set(update.category, (categoryCount.get(update.category) ?? 0) + 1);
  }

  return categoryCount;
}

function topCategories(updates: RankedUpdate[]) {
  const counts = groupByCategory(updates);

  return CATEGORY_ORDER.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

export function summarizeProductDirection(
  product: TrackedProduct,
  updates: RankedUpdate[],
) {
  if (updates.length === 0) {
    return `${product.name} is currently represented through its known positioning around ${CATEGORY_META[product.recentBias[0]].label.toLowerCase()} and ${CATEGORY_META[product.recentBias[1] ?? product.recentBias[0]].label.toLowerCase()} priorities while live coverage is still sparse.`;
  }

  const recentUpdates = updates.slice(0, 3);
  const top = topCategories(recentUpdates);
  const lead = top[0]?.category ?? product.recentBias[0];
  const support = top[1]?.category ?? product.recentBias[1] ?? lead;

  return `${product.name} is concentrating recent product energy on ${CATEGORY_META[lead].label.toLowerCase()} and ${CATEGORY_META[support].label.toLowerCase()} priorities, with ${recentUpdates[0]?.featureName.toLowerCase() ?? "recent platform work"} sharpening the product's position for team adoption and day-to-day use.`;
}

export function summarizeRecentFocus(product: TrackedProduct, updates: RankedUpdate[]) {
  const top = topCategories(updates.slice(0, 4));
  const labels = top.map((entry) => CATEGORY_META[entry.category].label.toLowerCase());

  if (labels.length === 0) {
    return `${product.name} does not yet have enough live signals to establish a fresh focus cluster, so the dashboard is leaning on its known positioning and recent bias.`;
  }

  return `${product.name} is clustering its latest move set around ${sentenceList(labels)} capabilities, suggesting a deliberate push toward more repeatable team workflows and higher-utility surfaces.`;
}

export function generateWeeklyInsight(
  updates: RankedUpdate[],
  products: TrackedProduct[],
  referenceDate: Date = REFERENCE_DATE,
): WeeklyInsight {
  const weekUpdates = updates.filter(
    (update) => daysBetween(referenceDate, new Date(update.publishedAt)) <= 7,
  );

  const topWeekCategories = topCategories(weekUpdates);
  const productScoreMap = new Map<string, number>();

  for (const update of weekUpdates) {
    productScoreMap.set(
      update.productSlug,
      (productScoreMap.get(update.productSlug) ?? 0) + update.score,
    );
  }

  const topProducts = products
    .map((product) => ({
      name: product.name,
      score: productScoreMap.get(product.slug) ?? 0,
    }))
    .sort((left, right) => right.score - left.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 3)
    .map((entry) => entry.name);
  const resolvedTopProducts =
    topProducts.length > 0 ? topProducts : products.slice(0, 3).map((product) => product.name);

  const leadCategory = topWeekCategories[0]?.category ?? "workflow";
  const supportCategory = topWeekCategories[1]?.category ?? "memory";
  const supportingSignals =
    weekUpdates.length > 0
      ? weekUpdates.slice(0, 4).map((update) => {
          return `${update.product} pushed ${update.featureName.toLowerCase()}, reinforcing its ${CATEGORY_META[update.category].label.toLowerCase()} position this week.`;
        })
      : [
          "No live updates landed inside the current seven-day window, so the preview is ranking the latest available product movement instead.",
        ];

  return {
    headline: `${CATEGORY_META[leadCategory].label} depth and ${CATEGORY_META[supportCategory].label.toLowerCase()} continuity shaped this week's AI product movement`,
    summary: `Across ${weekUpdates.length} ranked product moves, ${sentenceList(resolvedTopProducts)} set the pace. The market leaned toward deeper ${CATEGORY_META[leadCategory].label.toLowerCase()} capability, stronger ${CATEGORY_META[supportCategory].label.toLowerCase()} retention, and more operational surfaces for strategy, research, and delivery teams.`,
    signals: supportingSignals,
    topProducts: resolvedTopProducts,
  };
}

export function buildComparisonDirection(cards: ComparisonCard[]) {
  const statements = cards.map((card) => {
    const dominant = card.dominantCategories
      .slice(0, 2)
      .map((category) => CATEGORY_META[category].label.toLowerCase());

    return `${card.name} is most active in ${sentenceList(dominant)}.`;
  });

  return `${statements.join(" ")} Together, the selected set shows whether competitive pressure is clustering around research depth, workflow orchestration, or heavier agent execution.`;
}

export function calculateFocusScores(updates: RankedUpdate[]) {
  return FOCUS_PILLARS.reduce(
    (accumulator, pillar) => {
      accumulator[pillar] = updates.reduce((sum, update) => {
        return sum + (update.category === pillar ? update.importance : 0);
      }, 0);

      return accumulator;
    },
    {} as Record<(typeof FOCUS_PILLARS)[number], number>,
  );
}

export function buildProductSnapshot(
  product: TrackedProduct,
  updates: RankedUpdate[],
  referenceDate: Date = REFERENCE_DATE,
): ProductSnapshot {
  const strongestCategory =
    topCategories(updates)[0]?.category ?? product.recentBias[0] ?? "workflow";
  const momentumScore = updates.slice(0, 3).reduce((sum, update) => sum + update.score, 0);

  return {
    slug: product.slug,
    name: product.name,
    totalUpdates: updates.length,
    momentumScore,
    recentFocus: summarizeRecentFocus(product, updates),
    strongestCategory,
    lastUpdated: updates[0]?.publishedAt ?? referenceDate.toISOString(),
    pricingModel: product.pricingModel,
  };
}
