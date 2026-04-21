import { CATEGORY_META } from "@/lib/intelligence/constants";
import type { IntelligenceSourceStatus } from "@/lib/intelligence/runtime";
import type { ResearchRun, RunEvidence } from "@/lib/intelligence/run-types";
import type { RankedUpdate } from "@/lib/intelligence/types";

function buildEvidenceId(runId: string, updateId: string) {
  return `${runId}::${updateId}`;
}

function buildSourceUrlMap(sourceStatuses: IntelligenceSourceStatus[] = []) {
  const map = new Map<string, string>();

  for (const status of sourceStatuses) {
    map.set(`${status.product}::${status.source}`, status.url);
    map.set(status.source, status.url);
  }

  return map;
}

function buildRetrievalText(update: RankedUpdate, sourceUrl: string) {
  const categoryLabel = CATEGORY_META[update.category].label.toLowerCase();

  return [
    update.product,
    update.productSlug,
    update.source,
    sourceUrl,
    update.title,
    update.featureName,
    update.excerpt,
    update.body,
    categoryLabel,
    update.category,
    update.changeType,
    ...update.focusTags,
    ...update.signalPhrases,
  ]
    .join(" ")
    .toLowerCase();
}

export function buildRunEvidence(
  runId: string,
  updates: RankedUpdate[],
  sourceStatuses: IntelligenceSourceStatus[] = [],
) {
  const sourceUrlMap = buildSourceUrlMap(sourceStatuses);

  return updates.map((update) => {
    const sourceUrl =
      sourceUrlMap.get(`${update.product}::${update.source}`) ??
      sourceUrlMap.get(update.source) ??
      "";

    return {
      evidenceId: buildEvidenceId(runId, update.id),
      runId,
      product: update.product,
      productSlug: update.productSlug,
      source: update.source,
      sourceUrl,
      publishedAt: update.publishedAt,
      title: update.title,
      snippet: update.excerpt,
      retrievalText: buildRetrievalText(update, sourceUrl),
      category: update.category,
      changeType: update.changeType,
      focusTags: update.focusTags,
    } satisfies RunEvidence;
  });
}

export function ensureRunEvidence(run: ResearchRun): ResearchRun {
  if (run.evidence.length > 0) {
    return run;
  }

  return {
    ...run,
    evidence: buildRunEvidence(run.runId, run.updates, run.runtime.sourceStatuses),
  };
}
