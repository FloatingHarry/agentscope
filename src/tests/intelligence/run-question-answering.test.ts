import { afterEach, describe, expect, it, vi } from "vitest";

import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import { buildRunEvidence } from "@/lib/intelligence/run-evidence";
import { createPendingRunDiff } from "@/lib/intelligence/run-diff";
import {
  answerRunQuestion,
  retrieveRunEvidence,
} from "@/lib/intelligence/run-question-answering";
import type { ResearchRun } from "@/lib/intelligence/run-types";
import { generateWeeklyInsight } from "@/lib/intelligence/summary-generator";
import { rawUpdates } from "@/lib/intelligence/raw-updates";
import { classifyUpdates } from "@/lib/intelligence/update-classifier";
import { normalizeRawUpdates } from "@/lib/intelligence/update-normalizer";
import { rankUpdates } from "@/lib/intelligence/update-ranker";

function buildRunFixture(): ResearchRun {
  const referenceDate = new Date("2026-04-09T12:00:00.000Z");
  const prepared = normalizeRawUpdates(rawUpdates.slice(0, 8), TRACKED_PRODUCTS);
  const normalized = classifyUpdates(prepared);
  const updates = rankUpdates(normalized, referenceDate);
  const sourceStatuses = updates.map((update) => ({
    product: update.product,
    productSlug: update.productSlug,
    source: update.source,
    url: `https://example.com/${update.productSlug}`,
    status: "live" as const,
    updateCount: 1,
    latestPublishedAt: update.publishedAt,
  }));

  return {
    runId: "run-test",
    createdAt: referenceDate.toISOString(),
    updatedAt: referenceDate.toISOString(),
    status: "review_required",
    products: TRACKED_PRODUCTS,
    updates,
    evidence: buildRunEvidence("run-test", updates, sourceStatuses),
    weeklyInsight: generateWeeklyInsight(updates, TRACKED_PRODUCTS, referenceDate),
    runtime: {
      generatedAt: referenceDate.toISOString(),
      referenceDate: referenceDate.toISOString(),
      sourceAttemptCount: 8,
      sourceSuccessCount: 8,
      sourceStatuses,
    },
    diff: createPendingRunDiff("Fixture diff"),
  };
}

describe("run question answering", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns retrieval-only evidence when no OpenAI key is configured", async () => {
    const run = buildRunFixture();
    const response = await answerRunQuestion(
      run,
      "What is ChatGPT focusing on most recently in this run?",
    );

    expect(response.generationMode).toBe("retrieval-only");
    expect(response.answer).toContain("Retrieval-only mode is active");
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations.some((citation) => citation.product === "ChatGPT")).toBe(true);
    expect(response.citations[0]?.retrievalRank).toBe(1);
    expect(response.citations[0]?.retrievalScore).toBeGreaterThan(0);
    expect(response.citations[0]?.retrievalReasons.length).toBeGreaterThan(0);
    expect(response.warning).toContain("OPENAI_API_KEY");
  });

  it("returns a clear insufficient-evidence response when nothing relevant is retrieved", async () => {
    const run = buildRunFixture();
    const response = await answerRunQuestion(
      run,
      "What did Midjourney ship for image upscaling in this run?",
    );

    expect(response.answer).toBeNull();
    expect(response.citations).toHaveLength(0);
    expect(response.retrievedCount).toBe(0);
    expect(response.warning).toContain("Insufficient evidence in this run");
  });

  it("uses OpenAI when configured and returns cited run evidence", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-5.4-mini");

    const run = buildRunFixture();
    const question = "What is ChatGPT focusing on most recently in this run?";
    const retrieved = retrieveRunEvidence(run, question);

    const response = await answerRunQuestion(run, question, {
      fetchImpl: vi.fn(async () => {
        return new Response(
          JSON.stringify({
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      answer:
                        "ChatGPT is concentrating on memory and workflow-oriented controls in this run.",
                      citationEvidenceIds: [retrieved[0].evidenceId],
                    }),
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }) as typeof fetch,
    });

    expect(response.generationMode).toBe("llm");
    expect(response.answer).toContain("ChatGPT");
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0]?.evidenceId).toBe(retrieved[0].evidenceId);
    expect(response.citations[0]?.matchedTerms.length).toBeGreaterThan(0);
  });

  it("falls back to retrieval-only mode when OpenAI generation fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const run = buildRunFixture();
    const response = await answerRunQuestion(
      run,
      "Which product showed the strongest workflow movement in this run?",
      {
        fetchImpl: vi.fn(async () => {
          return new Response(
            JSON.stringify({
              error: {
                message: "Temporary OpenAI outage",
              },
            }),
            {
              status: 500,
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }) as typeof fetch,
      },
    );

    expect(response.generationMode).toBe("retrieval-only");
    expect(response.answer).toContain("Retrieval-only mode is active");
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.warning).toContain("fell back to retrieval-only mode");
  });
});
