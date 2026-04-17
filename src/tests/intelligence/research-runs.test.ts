import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardViewData } from "@/lib/intelligence/builders";
import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import { executeResearchRun } from "@/lib/intelligence/research-run-agent";
import {
  createResearchRun,
  getLatestPublishedRun,
  getResearchRun,
  getResearchRunIndex,
  publishResearchRun,
  rejectResearchRun,
  saveResearchRun,
} from "@/lib/intelligence/run-store";
import { generateWeeklyInsight } from "@/lib/intelligence/summary-generator";
import { rawUpdates } from "@/lib/intelligence/raw-updates";
import { classifyUpdates } from "@/lib/intelligence/update-classifier";
import { normalizeRawUpdates } from "@/lib/intelligence/update-normalizer";
import { rankUpdates } from "@/lib/intelligence/update-ranker";

function buildReviewReadyFixture() {
  const referenceDate = new Date("2026-04-09T12:00:00.000Z");
  const prepared = normalizeRawUpdates(rawUpdates.slice(0, 8), TRACKED_PRODUCTS);
  const normalized = classifyUpdates(prepared);
  const updates = rankUpdates(normalized, referenceDate);

  return {
    referenceDate,
    updates,
    weeklyInsight: generateWeeklyInsight(updates, TRACKED_PRODUCTS, referenceDate),
  };
}

describe("research runs", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-product-intelligence-agent-"));
    vi.stubEnv("INTELLIGENCE_RUN_STORE_DIR", tempDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a running run, then publishes a review-ready draft into published mode", async () => {
    const baseRun = await createResearchRun();
    const fixture = buildReviewReadyFixture();

    const reviewReadyRun = await saveResearchRun({
      ...baseRun,
      updatedAt: fixture.referenceDate.toISOString(),
      status: "review_required",
      products: TRACKED_PRODUCTS,
      updates: fixture.updates,
      weeklyInsight: fixture.weeklyInsight,
      runtime: {
        generatedAt: fixture.referenceDate.toISOString(),
        referenceDate: fixture.referenceDate.toISOString(),
        sourceAttemptCount: 8,
        sourceSuccessCount: 7,
        activeSourceLabels: ["OpenAI News RSS"],
        sourceFailureDetails: ["Perplexity source unavailable"],
        sourceStatuses: [
          {
            product: "ChatGPT",
            productSlug: "chatgpt",
            source: "OpenAI News RSS",
            url: "https://openai.com/news/rss.xml",
            status: "live",
            updateCount: fixture.updates.length,
            latestPublishedAt: fixture.updates[0]?.publishedAt,
          },
        ],
      },
    });

    const publishedRun = await publishResearchRun(reviewReadyRun.runId);
    const index = await getResearchRunIndex();

    expect(publishedRun.status).toBe("published");
    expect(index.latestPublished?.runId).toBe(reviewReadyRun.runId);
    expect(index.runs[0]?.headline).toBe(reviewReadyRun.weeklyInsight?.headline);
    expect(index.runs[0]?.diffSummary).toContain("Diff will appear");
  });

  it("keeps the latest published pointer intact when a later review-ready run is rejected", async () => {
    const firstRun = await createResearchRun();
    const fixture = buildReviewReadyFixture();

    await publishResearchRun(
      (
        await saveResearchRun({
          ...firstRun,
          updatedAt: fixture.referenceDate.toISOString(),
          status: "review_required",
          products: TRACKED_PRODUCTS,
          updates: fixture.updates,
          weeklyInsight: fixture.weeklyInsight,
          runtime: {
            generatedAt: fixture.referenceDate.toISOString(),
            referenceDate: fixture.referenceDate.toISOString(),
            sourceAttemptCount: 8,
            sourceSuccessCount: 7,
            sourceStatuses: [],
          },
        })
      ).runId,
    );

    const secondRun = await createResearchRun();
    const rejectedRun = await rejectResearchRun(
      (
        await saveResearchRun({
          ...secondRun,
          updatedAt: fixture.referenceDate.toISOString(),
          status: "review_required",
          products: TRACKED_PRODUCTS,
          updates: fixture.updates.slice(0, 4),
          weeklyInsight: fixture.weeklyInsight,
          runtime: {
            generatedAt: fixture.referenceDate.toISOString(),
            referenceDate: fixture.referenceDate.toISOString(),
            sourceAttemptCount: 8,
            sourceSuccessCount: 5,
            sourceStatuses: [],
          },
        })
      ).runId,
    );

    const index = await getResearchRunIndex();

    expect(rejectedRun.status).toBe("rejected");
    expect(index.latestPublished?.runId).toBe(firstRun.runId);
  });

  it("exposes a clear empty state when published mode has no reviewed run yet", async () => {
    const { runtime, data } = await getDashboardViewData({ mode: "published" });

    expect(runtime.requestedMode).toBe("published");
    expect(runtime.resolvedMode).toBe("published");
    expect(runtime.publishedAvailable).toBe(false);
    expect(runtime.fallbackReason).toContain("No published research run");
    expect(data.recentUpdates).toHaveLength(0);
  });

  it("reads the latest published run without changing the dashboard payload shape", async () => {
    const baseRun = await createResearchRun();
    const fixture = buildReviewReadyFixture();
    const reviewReadyRun = await saveResearchRun({
      ...baseRun,
      updatedAt: fixture.referenceDate.toISOString(),
      status: "review_required",
      products: TRACKED_PRODUCTS,
      updates: fixture.updates,
      weeklyInsight: fixture.weeklyInsight,
      runtime: {
        generatedAt: fixture.referenceDate.toISOString(),
        referenceDate: fixture.referenceDate.toISOString(),
        sourceAttemptCount: 8,
        sourceSuccessCount: 6,
        sourceStatuses: [],
      },
    });

    await publishResearchRun(reviewReadyRun.runId);

    const { runtime, data } = await getDashboardViewData({ mode: "published" });

    expect(runtime.requestedMode).toBe("published");
    expect(runtime.resolvedMode).toBe("published");
    expect(runtime.publishedAvailable).toBe(true);
    expect(runtime.publishedRunId).toBe(reviewReadyRun.runId);
    expect(data.generatedAt).toBe(fixture.referenceDate.toISOString());
    expect(data.recentUpdates.length).toBeGreaterThan(0);
    expect(data.topMovers).toHaveLength(4);
  });

  it("flags a repeat run with no new signals when the ranked update set is unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("openai.com/news/rss.xml")) {
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <item>
                  <title>ChatGPT adds project memory controls</title>
                  <description>ChatGPT update for memory settings.</description>
                  <pubDate>Wed, 08 Apr 2026 09:00:00 GMT</pubDate>
                  <link>https://openai.com/index/chatgpt-memory/</link>
                </item>
              </channel>
            </rss>`,
            {
              status: 200,
              headers: {
                "content-type": "application/rss+xml",
              },
            },
          );
        }

        throw new Error("source unavailable");
      }),
    );

    await executeResearchRun();
    const repeatedRun = await executeResearchRun();

    expect(repeatedRun.diff.hasNewSignals).toBe(false);
    expect(repeatedRun.diff.summary).toContain("No new official updates");
  });

  it("executes an official research run and persists the review-ready result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("openai.com/news/rss.xml")) {
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <item>
                  <title>ChatGPT adds project memory controls</title>
                  <description>ChatGPT update for memory settings.</description>
                  <pubDate>Wed, 08 Apr 2026 09:00:00 GMT</pubDate>
                  <link>https://openai.com/index/chatgpt-memory/</link>
                </item>
              </channel>
            </rss>`,
            {
              status: 200,
              headers: {
                "content-type": "application/rss+xml",
              },
            },
          );
        }

        throw new Error("source unavailable");
      }),
    );

    const run = await executeResearchRun();
    const storedRun = await getResearchRun(run.runId);

    expect(run.status).toBe("review_required");
    expect(run.runtime.sourceAttemptCount).toBe(8);
    expect(run.runtime.sourceSuccessCount).toBe(1);
    expect(run.updates.length).toBeGreaterThan(0);
    expect(run.diff.summary).toContain("first recorded research run");
    expect(storedRun?.status).toBe("review_required");
    expect((await getLatestPublishedRun())).toBeNull();
  });
});
