import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import { OfficialSourceIntelligenceProvider } from "@/lib/intelligence/live-provider";
import { buildResearchRunDiff, createPendingRunDiff } from "@/lib/intelligence/run-diff";
import {
  createResearchRun,
  getPreviousCompletedResearchRun,
  saveResearchRun,
} from "@/lib/intelligence/run-store";
import type { ResearchRun } from "@/lib/intelligence/run-types";
import { generateWeeklyInsight } from "@/lib/intelligence/summary-generator";
import { classifyUpdates } from "@/lib/intelligence/update-classifier";
import { normalizeRawUpdates } from "@/lib/intelligence/update-normalizer";
import { rankUpdates } from "@/lib/intelligence/update-ranker";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The research run failed unexpectedly.";
}

export async function executeResearchRun(options?: { fetchImpl?: typeof fetch }) {
  const initialRun = await createResearchRun();
  const previousRun = await getPreviousCompletedResearchRun(initialRun.runId);
  const provider = new OfficialSourceIntelligenceProvider(options?.fetchImpl);

  try {
    const products = await provider.getProducts();
    const preparedUpdates = normalizeRawUpdates(await provider.getRawUpdates(), products);
    const normalizedUpdates = classifyUpdates(preparedUpdates);
    const referenceDate = new Date();
    const updates = rankUpdates(normalizedUpdates, referenceDate);
    const weeklyInsight = generateWeeklyInsight(updates, products, referenceDate);
    const summary = provider.getSummary();

    const completedRun: ResearchRun = {
      ...initialRun,
      updatedAt: new Date().toISOString(),
      status: "review_required",
      products,
      updates,
      weeklyInsight,
      runtime: {
        generatedAt: referenceDate.toISOString(),
        referenceDate: referenceDate.toISOString(),
        sourceAttemptCount: summary.attempted,
        sourceSuccessCount: summary.succeeded,
        activeSourceLabels: summary.activeSources,
        sourceFailureDetails: summary.failedSources,
        sourceStatuses: summary.sourceStatuses,
      },
      diff: buildResearchRunDiff(
        {
          runId: initialRun.runId,
          createdAt: initialRun.createdAt,
          updates,
          runtime: {
            generatedAt: referenceDate.toISOString(),
            referenceDate: referenceDate.toISOString(),
            sourceAttemptCount: summary.attempted,
            sourceSuccessCount: summary.succeeded,
            activeSourceLabels: summary.activeSources,
            sourceFailureDetails: summary.failedSources,
            sourceStatuses: summary.sourceStatuses,
          },
        },
        previousRun,
      ),
    };

    return saveResearchRun(completedRun);
  } catch (error) {
    const summary = provider.getSummary();

    return saveResearchRun({
      ...initialRun,
      updatedAt: new Date().toISOString(),
      status: "failed",
      failureReason: toErrorMessage(error),
      products: TRACKED_PRODUCTS,
      updates: [],
      weeklyInsight: null,
      runtime: {
        generatedAt: new Date().toISOString(),
        referenceDate: new Date().toISOString(),
        sourceAttemptCount: summary.attempted,
        sourceSuccessCount: summary.succeeded,
        activeSourceLabels: summary.activeSources,
        sourceFailureDetails: summary.failedSources,
        sourceStatuses: summary.sourceStatuses,
      },
      diff: createPendingRunDiff("Run failed before signal-level comparison could be completed."),
    });
  }
}
