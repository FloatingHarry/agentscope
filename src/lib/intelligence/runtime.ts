import { REFERENCE_DATE } from "@/lib/intelligence/constants";

export type IntelligenceMode = "mock" | "live" | "published";

export interface IntelligenceSourceStatus {
  product: string;
  productSlug: string;
  source: string;
  url: string;
  status: "live" | "failed";
  updateCount: number;
  latestPublishedAt?: string;
  errorMessage?: string;
}

export interface IntelligenceRuntimeMeta {
  requestedMode: IntelligenceMode;
  resolvedMode: IntelligenceMode;
  fallbackReason?: string;
  generatedAt: string;
  referenceDate: Date;
  sourceName: string;
  sourceVariant?: "mock" | "curated-json" | "official-sources" | "published-run";
  sourceAttemptCount?: number;
  sourceSuccessCount?: number;
  activeSourceLabels?: string[];
  sourceFailureDetails?: string[];
  sourceStatuses?: IntelligenceSourceStatus[];
  publishedAvailable?: boolean;
  publishedRunId?: string;
  publishedUpdatedAt?: string;
  publishedHeadline?: string;
}

export function parseIntelligenceMode(
  value: string | string[] | null | undefined,
): IntelligenceMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "live") {
    return "live";
  }

  if (candidate === "published") {
    return "published";
  }

  return "mock";
}

export function applyModeToSearchParams(
  params: URLSearchParams,
  mode: IntelligenceMode,
) {
  if (mode === "mock") {
    params.delete("mode");
    return params;
  }

  params.set("mode", mode);

  return params;
}

export function buildModeHref(href: string, mode: IntelligenceMode) {
  const [pathname, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);
  applyModeToSearchParams(params, mode);

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function resolveReferenceDate(mode: IntelligenceMode) {
  return mode === "mock" ? new Date(REFERENCE_DATE) : new Date();
}
