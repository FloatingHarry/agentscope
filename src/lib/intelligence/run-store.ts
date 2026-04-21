import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import { ensureRunEvidence } from "@/lib/intelligence/run-evidence";
import { createPendingRunDiff } from "@/lib/intelligence/run-diff";
import type {
  PublishedPointer,
  ResearchRun,
  ResearchRunIndex,
  ResearchRunSummary,
} from "@/lib/intelligence/run-types";

const RUN_STORE_ROOT = path.join("data", "runs");
const INDEX_FILENAME = "index.json";
const RUNS_DIRNAME = "runs";

function getStoreRoot() {
  return process.env.INTELLIGENCE_RUN_STORE_DIR?.trim() || path.join(process.cwd(), RUN_STORE_ROOT);
}

function getIndexPath() {
  return path.join(getStoreRoot(), INDEX_FILENAME);
}

function getRunsDirectory() {
  return path.join(getStoreRoot(), RUNS_DIRNAME);
}

function getRunFilePath(runId: string) {
  return path.join(getRunsDirectory(), `${runId}.json`);
}

function createEmptyIndex(): ResearchRunIndex {
  return {
    runs: [],
  };
}

async function ensureStore() {
  await mkdir(getRunsDirectory(), { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
  await ensureStore();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function hydrateResearchRun(run: ResearchRun): ResearchRun {
  return ensureRunEvidence({
    ...run,
    evidence: run.evidence ?? [],
    diff:
      run.diff ??
      createPendingRunDiff("This run was created before diff tracking was added."),
  });
}

function sortRunSummaries(runs: ResearchRunSummary[]) {
  return [...runs].sort((left, right) => {
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

function toHeadline(run: ResearchRun) {
  if (run.weeklyInsight?.headline) {
    return run.weeklyInsight.headline;
  }

  if (run.status === "running") {
    return "Research run in progress";
  }

  if (run.status === "failed") {
    return "Research run failed before draft generation";
  }

  return "Research run is awaiting a draft brief";
}

function toSummary(run: ResearchRun): ResearchRunSummary {
  return {
    runId: run.runId,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    status: run.status,
    headline: toHeadline(run),
    sourceAttemptCount: run.runtime.sourceAttemptCount ?? 0,
    sourceSuccessCount: run.runtime.sourceSuccessCount ?? 0,
    topProducts: run.weeklyInsight?.topProducts ?? [],
    updateCount: run.updates.length,
    diffSummary: run.diff.summary,
    hasNewSignals: run.diff.hasNewSignals,
    newSignalCount: run.diff.newUpdateIds.length,
  };
}

async function readIndex() {
  const index = await readJson<ResearchRunIndex>(getIndexPath());
  return index ?? createEmptyIndex();
}

async function writeIndex(index: ResearchRunIndex) {
  await writeJson(getIndexPath(), {
    ...index,
    runs: sortRunSummaries(index.runs),
  });
}

async function upsertRunSummary(run: ResearchRun, latestPublished?: PublishedPointer) {
  const index = await readIndex();
  const summary = toSummary(run);
  const runs = index.runs.filter((item) => item.runId !== run.runId);
  runs.unshift(summary);

  await writeIndex({
    runs,
    latestPublished: latestPublished ?? index.latestPublished,
  });

  return summary;
}

export async function listResearchRuns() {
  const index = await readIndex();
  return sortRunSummaries(index.runs);
}

export async function getResearchRunIndex() {
  return readIndex();
}

export async function getResearchRun(runId: string) {
  const run = await readJson<ResearchRun>(getRunFilePath(runId));
  return run ? hydrateResearchRun(run) : null;
}

export async function getLatestPublishedRun() {
  const index = await readIndex();

  if (!index.latestPublished?.runId) {
    return null;
  }

  return getResearchRun(index.latestPublished.runId);
}

export async function getPreviousCompletedResearchRun(excludeRunId: string) {
  const index = await readIndex();

  for (const summary of sortRunSummaries(index.runs)) {
    if (summary.runId === excludeRunId) {
      continue;
    }

    const run = await getResearchRun(summary.runId);

    if (run && run.status !== "running") {
      return run;
    }
  }

  return null;
}

export async function createResearchRun() {
  const now = new Date().toISOString();
  const runId = `run-${now.replace(/[:.]/g, "-")}`;

  const run: ResearchRun = {
    runId,
    createdAt: now,
    updatedAt: now,
    status: "running",
    products: TRACKED_PRODUCTS,
    updates: [],
    evidence: [],
    weeklyInsight: null,
    runtime: {
      generatedAt: now,
      referenceDate: now,
      sourceStatuses: [],
    },
    diff: createPendingRunDiff("Research run has started. Diff will appear once ingestion finishes."),
  };

  await writeJson(getRunFilePath(run.runId), run);
  await upsertRunSummary(run);

  return run;
}

export async function saveResearchRun(run: ResearchRun) {
  await writeJson(getRunFilePath(run.runId), run);
  await upsertRunSummary(run);
  return run;
}

export async function publishResearchRun(runId: string) {
  const run = await getResearchRun(runId);

  if (!run) {
    throw new Error("Research run not found.");
  }

  if (run.status !== "review_required" && run.status !== "published") {
    throw new Error("Only review-ready runs can be published.");
  }

  const publishedAt = new Date().toISOString();
  const nextRun: ResearchRun = {
    ...run,
    status: "published",
    updatedAt: publishedAt,
  };

  await writeJson(getRunFilePath(runId), nextRun);
  await upsertRunSummary(nextRun, {
    runId,
    publishedAt,
    headline: toHeadline(nextRun),
  });

  return nextRun;
}

export async function rejectResearchRun(runId: string) {
  const run = await getResearchRun(runId);

  if (!run) {
    throw new Error("Research run not found.");
  }

  if (run.status !== "review_required") {
    throw new Error("Only review-ready runs can be rejected.");
  }

  const nextRun: ResearchRun = {
    ...run,
    status: "rejected",
    updatedAt: new Date().toISOString(),
  };

  await writeJson(getRunFilePath(runId), nextRun);
  await upsertRunSummary(nextRun);

  return nextRun;
}
