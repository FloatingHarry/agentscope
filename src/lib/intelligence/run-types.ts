import type { IntelligenceSourceStatus } from "@/lib/intelligence/runtime";
import type {
  CategoryKey,
  ChangeType,
  RankedUpdate,
  TrackedProduct,
  WeeklyInsight,
} from "@/lib/intelligence/types";

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

export interface RunEvidence {
  evidenceId: string;
  runId: string;
  product: string;
  productSlug: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  title: string;
  snippet: string;
  retrievalText: string;
  category: CategoryKey;
  changeType: ChangeType;
  focusTags: string[];
}

export interface ResearchRun {
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;
  failureReason?: string;
  products: TrackedProduct[];
  updates: RankedUpdate[];
  evidence: RunEvidence[];
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

export interface RunQuestionRequest {
  question: string;
}

export interface RunQuestionCitation {
  evidenceId: string;
  retrievalRank: number;
  retrievalScore: number;
  source: string;
  sourceUrl: string;
  product: string;
  title: string;
  snippet: string;
  publishedAt: string;
  category: CategoryKey;
  changeType: ChangeType;
  focusTags: string[];
  matchedTerms: string[];
  retrievalReasons: string[];
}

export interface RunQuestionResponse {
  answer: string | null;
  citations: RunQuestionCitation[];
  retrievedCount: number;
  generationMode: "llm" | "retrieval-only";
  warning?: string;
}
