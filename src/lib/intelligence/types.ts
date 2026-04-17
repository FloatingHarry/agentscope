export type CategoryKey =
  | "agent"
  | "search"
  | "memory"
  | "workflow"
  | "collaboration"
  | "pricing"
  | "developer-tools";

export type FocusPillar = Extract<
  CategoryKey,
  "agent" | "search" | "memory" | "workflow" | "pricing"
>;

export type ChangeType =
  | "launch"
  | "upgrade"
  | "integration"
  | "pricing"
  | "expansion"
  | "workflow";

export interface RawUpdate {
  id: string;
  product: string;
  title: string;
  body: string;
  publishedAt: string;
  source: string;
}

export interface PreparedUpdate extends RawUpdate {
  productSlug: string;
  featureName: string;
  excerpt: string;
  searchableText: string;
}

export interface NormalizedUpdate {
  id: string;
  product: string;
  productSlug: string;
  title: string;
  body: string;
  featureName: string;
  category: CategoryKey;
  changeType: ChangeType;
  importance: number;
  publishedAt: string;
  source: string;
  excerpt: string;
  focusTags: string[];
  signalPhrases: string[];
}

export interface RankedUpdate extends NormalizedUpdate {
  score: number;
  rankReason: string[];
  recencyBucket: "this-week" | "last-two-weeks" | "earlier";
}

export interface TrackedProduct {
  slug: string;
  name: string;
  company: string;
  segment: string;
  positioning: string;
  pricingModel: string;
  description: string;
  recentBias: CategoryKey[];
  accent: string;
}

export interface CategoryOverviewItem {
  category: CategoryKey;
  label: string;
  count: number;
  share: number;
  weekDelta: number;
}

export interface TrendPoint {
  weekLabel: string;
  weekStart: string;
  total: number;
  agent: number;
  search: number;
  memory: number;
  workflow: number;
  collaboration: number;
  pricing: number;
  "developer-tools": number;
}

export interface ProductSnapshot {
  slug: string;
  name: string;
  totalUpdates: number;
  momentumScore: number;
  recentFocus: string;
  strongestCategory: CategoryKey;
  lastUpdated: string;
  pricingModel: string;
}

export interface WeeklyInsight {
  headline: string;
  summary: string;
  signals: string[];
  topProducts: string[];
}

export interface DashboardPayload {
  trackedProducts: ProductSnapshot[];
  recentUpdates: RankedUpdate[];
  categoryOverview: CategoryOverviewItem[];
  weeklyInsight: WeeklyInsight;
  topMovers: ProductSnapshot[];
  trendSeries: TrendPoint[];
  generatedAt: string;
}

export interface ProductInsight {
  product: TrackedProduct;
  timeline: RankedUpdate[];
  categoryDistribution: CategoryOverviewItem[];
  recentFocus: string;
  directionSummary: string;
  momentumScore: number;
  recentSignals: string[];
}

export interface ComparisonCard {
  slug: string;
  name: string;
  updateFrequency: number;
  dominantCategories: CategoryKey[];
  productDirection: string;
  focus: Record<FocusPillar, number>;
  momentumScore: number;
  pricingModel: string;
}

export interface CategoryMatrixRow {
  category: CategoryKey;
  label: string;
  [productSlug: string]: string | number;
}

export interface FocusMatrixRow {
  pillar: FocusPillar;
  label: string;
  [productSlug: string]: string | number;
}

export interface FrequencyPoint {
  weekLabel: string;
  weekStart: string;
  [productSlug: string]: string | number;
}

export interface ComparisonSnapshot {
  selectedProducts: TrackedProduct[];
  cards: ComparisonCard[];
  frequencySeries: FrequencyPoint[];
  categoryMatrix: CategoryMatrixRow[];
  focusMatrix: FocusMatrixRow[];
  directionSummary: string;
}

export interface WeeklyBriefData {
  insight: WeeklyInsight;
  trendSeries: TrendPoint[];
  watchlist: ProductSnapshot[];
  notableSignals: RankedUpdate[];
  categoryOverview: CategoryOverviewItem[];
}
