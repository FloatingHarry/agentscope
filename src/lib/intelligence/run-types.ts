import type { IntelligenceSourceStatus } from "@/lib/intelligence/runtime";
import type { RankedUpdate, TrackedProduct, WeeklyInsight } from "@/lib/intelligence/types";

export type RunStatus =
  | "running"
  | "review_required"
  | "published"
  | "rejected"
  | "failed";

export interface ResearchRunRuntimeSnapshot {
  generatedAt: string;
  referenceDate: string;
  sourceAttemptCount?: number;
  sourceSuccessCount?: number;
  activeSourceLabels?: string[];
  sourceFailureDetails?: string[];
  sourceStatuses?: IntelligenceSourceStatus[];
}

export interface ResearchRunDiff {
  comparedToRunId?: string;
  comparedToCreatedAt?: string;
  newUpdateIds: string[];
  removedUpdateIds: string[];
  newProducts: string[];
  unchangedSources: string[];
  changedSources: string[];
  hasNewSignals: boolean;
  summary: string;
}

export interface ResearchRun {
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;
  failureReason?: string;
  products: TrackedProduct[];
  updates: RankedUpdate[];
  weeklyInsight: WeeklyInsight | null;
  runtime: ResearchRunRuntimeSnapshot;
  diff: ResearchRunDiff;
}

export interface ResearchRunSummary {
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;
  headline: string;
  sourceAttemptCount: number;
  sourceSuccessCount: number;
  topProducts: string[];
  updateCount: number;
  diffSummary: string;
  hasNewSignals: boolean;
  newSignalCount: number;
}

export interface PublishedPointer {
  runId: string;
  publishedAt: string;
  headline: string;
}

export interface ResearchRunIndex {
  runs: ResearchRunSummary[];
  latestPublished?: PublishedPointer;
}
