import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getComparisonSnapshot,
  getDashboardPayload,
  getDashboardViewData,
  getProductInsight,
  getWeeklyBriefData,
} from "@/lib/intelligence/builders";
import { REFERENCE_DATE, TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import { rawUpdates } from "@/lib/intelligence/raw-updates";
import { classifyUpdates } from "@/lib/intelligence/update-classifier";
import { normalizeRawUpdates } from "@/lib/intelligence/update-normalizer";
import { rankUpdates } from "@/lib/intelligence/update-ranker";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("intelligence pipeline", () => {
  it("preserves the full mock dataset through normalization, classification, and ranking", () => {
    const prepared = normalizeRawUpdates(rawUpdates, TRACKED_PRODUCTS);
    const normalized = classifyUpdates(prepared);
    const ranked = rankUpdates(normalized);

    expect(prepared).toHaveLength(rawUpdates.length);
    expect(normalized).toHaveLength(rawUpdates.length);
    expect(ranked).toHaveLength(rawUpdates.length);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked.at(-1)?.score ?? 0);
  });

  it("builds a dashboard payload with stable top-level sections", async () => {
    const payload = await getDashboardPayload();

    expect(payload.trackedProducts).toHaveLength(8);
    expect(payload.recentUpdates).toHaveLength(8);
    expect(payload.topMovers).toHaveLength(4);
    expect(payload.trendSeries).toHaveLength(6);
    expect(payload.weeklyInsight.headline.length).toBeGreaterThan(10);
    expect(payload.generatedAt).toBe(REFERENCE_DATE.toISOString());
  });

  it("builds a product detail payload for a tracked product", async () => {
    const insight = await getProductInsight("cursor");

    expect(insight).not.toBeNull();
    expect(insight?.timeline).toHaveLength(6);
    expect(insight?.categoryDistribution.some((item) => item.count > 0)).toBe(true);
    expect(insight?.directionSummary.length).toBeGreaterThan(20);
  });

  it("builds a comparison snapshot for two or three products", async () => {
    const snapshot = await getComparisonSnapshot(["chatgpt", "claude", "perplexity"]);

    expect(snapshot.selectedProducts).toHaveLength(3);
    expect(snapshot.cards).toHaveLength(3);
    expect(snapshot.focusMatrix).toHaveLength(5);
    expect(snapshot.frequencySeries).toHaveLength(6);
  });

  it("builds a weekly brief from the same dashboard data source", async () => {
    const brief = await getWeeklyBriefData();

    expect(brief.watchlist.length).toBeGreaterThanOrEqual(3);
    expect(brief.notableSignals.length).toBeGreaterThan(0);
    expect(brief.insight.topProducts.length).toBeGreaterThan(0);
  });

  it("supports an internal curated override without changing the public shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            updates: rawUpdates.slice(0, 8),
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }),
    );

    const { data, runtime } = await getDashboardViewData({
      mode: "live",
      liveUpdatesUrl: "https://example.com/live-updates.json",
    });

    expect(runtime.requestedMode).toBe("live");
    expect(runtime.resolvedMode).toBe("live");
    expect(runtime.sourceVariant).toBe("curated-json");
    expect(data.trackedProducts).toHaveLength(8);
    expect(data.recentUpdates.length).toBeGreaterThan(0);
    expect(data.generatedAt).not.toBe(REFERENCE_DATE.toISOString());
  });

  it("falls back to mock data when live preview fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network offline");
      }),
    );

    const { data, runtime } = await getDashboardViewData({
      mode: "live",
      liveUpdatesUrl: "https://example.com/live-updates.json",
    });

    expect(runtime.requestedMode).toBe("live");
    expect(runtime.resolvedMode).toBe("mock");
    expect(runtime.fallbackReason).toContain("network offline");
    expect(data.trackedProducts).toHaveLength(8);
    expect(data.generatedAt).toBe(REFERENCE_DATE.toISOString());
  });

  it("preserves official source status details when official live mode falls back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("official source offline");
      }),
    );

    const { runtime } = await getDashboardViewData({ mode: "live" });

    expect(runtime.requestedMode).toBe("live");
    expect(runtime.resolvedMode).toBe("mock");
    expect(runtime.sourceStatuses).toHaveLength(8);
    expect(runtime.sourceFailureDetails?.length).toBe(8);
  });

  it("ignores LIVE_UPDATES_URL env so public live mode still means official sources", async () => {
    vi.stubEnv("LIVE_UPDATES_URL", "https://example.com/live-updates.json");
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

    const { runtime } = await getDashboardViewData({ mode: "live" });

    expect(runtime.resolvedMode).toBe("live");
    expect(runtime.sourceVariant).toBe("official-sources");
    expect(runtime.sourceAttemptCount).toBe(8);
  });
});
