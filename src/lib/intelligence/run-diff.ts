import type { ResearchRun, ResearchRunDiff } from "@/lib/intelligence/run-types";

function sentenceList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function sourceStatusKey(runId: string, source: string) {
  return `${runId}:${source}`;
}

export function createPendingRunDiff(summary: string): ResearchRunDiff {
  return {
    newUpdateIds: [],
    removedUpdateIds: [],
    newProducts: [],
    unchangedSources: [],
    changedSources: [],
    hasNewSignals: false,
    summary,
  };
}

export function buildResearchRunDiff(
  currentRun: Pick<ResearchRun, "runId" | "createdAt" | "updates" | "runtime">,
  previousRun?: Pick<ResearchRun, "runId" | "createdAt" | "updates" | "runtime"> | null,
): ResearchRunDiff {
  if (!previousRun) {
    return {
      comparedToRunId: undefined,
      comparedToCreatedAt: undefined,
      newUpdateIds: currentRun.updates.map((update) => update.id),
      removedUpdateIds: [],
      newProducts: [...new Set(currentRun.updates.map((update) => update.product))],
      unchangedSources: [],
      changedSources: (currentRun.runtime.sourceStatuses ?? []).map((status) => status.source),
      hasNewSignals: currentRun.updates.length > 0,
      summary:
        "This is the first recorded research run, so future runs will compare new signals against it.",
    };
  }

  const previousUpdateIds = new Set(previousRun.updates.map((update) => update.id));
  const currentUpdateIds = new Set(currentRun.updates.map((update) => update.id));
  const newUpdates = currentRun.updates.filter((update) => !previousUpdateIds.has(update.id));
  const removedUpdateIds = previousRun.updates
    .filter((update) => !currentUpdateIds.has(update.id))
    .map((update) => update.id);
  const newProducts = [...new Set(newUpdates.map((update) => update.product))];

  const previousStatuses = new Map(
    (previousRun.runtime.sourceStatuses ?? []).map((status) => [
      sourceStatusKey(status.productSlug, status.source),
      status,
    ]),
  );
  const unchangedSources: string[] = [];
  const changedSources: string[] = [];

  for (const status of currentRun.runtime.sourceStatuses ?? []) {
    const previousStatus = previousStatuses.get(sourceStatusKey(status.productSlug, status.source));

    if (
      previousStatus &&
      previousStatus.status === status.status &&
      previousStatus.updateCount === status.updateCount &&
      (previousStatus.latestPublishedAt ?? "") === (status.latestPublishedAt ?? "")
    ) {
      unchangedSources.push(status.source);
    } else {
      changedSources.push(status.source);
    }
  }

  let summary = "";

  if (newUpdates.length > 0) {
    summary = `${newUpdates.length} new ranked signal${newUpdates.length === 1 ? "" : "s"} surfaced since the previous run${
      newProducts.length > 0 ? `, led by ${sentenceList(newProducts)}` : ""
    }.`;
  } else if (changedSources.length > 0) {
    summary = `No new ranked signals surfaced since the previous run, but ${changedSources.length} source${
      changedSources.length === 1 ? "" : "s"
    } changed state or coverage.`;
  } else {
    summary = `No new official updates surfaced since the previous run. ${unchangedSources.length} source${
      unchangedSources.length === 1 ? "" : "s"
    } were unchanged.`;
  }

  return {
    comparedToRunId: previousRun.runId,
    comparedToCreatedAt: previousRun.createdAt,
    newUpdateIds: newUpdates.map((update) => update.id),
    removedUpdateIds,
    newProducts,
    unchangedSources,
    changedSources,
    hasNewSignals: newUpdates.length > 0,
    summary,
  };
}
