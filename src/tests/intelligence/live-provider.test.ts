import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CuratedJsonIntelligenceProvider,
  OfficialSourceIntelligenceProvider,
  parseClaudeReleaseNotes,
  parseCursorChangelog,
  parseDevinReleaseNotes,
  parseFigmaReleaseNotes,
  parseGeminiFeed,
  parseNotionReleases,
  parseOpenAiFeed,
  parsePerplexityDocsChangelog,
} from "@/lib/intelligence/live-provider";

const fixturesDir = path.resolve(
  process.cwd(),
  "src/tests/intelligence/fixtures",
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("live source parsers", () => {
  it("parses ChatGPT updates from the OpenAI news RSS feed", () => {
    const content = readFileSync(path.join(fixturesDir, "openai-news-rss.xml"), "utf8");
    const updates = parseOpenAiFeed(content);

    expect(updates).toHaveLength(1);
    expect(updates[0].product).toBe("ChatGPT");
    expect(updates[0].title).toContain("ChatGPT");
  });

  it("parses Claude release notes from the official release notes article", () => {
    const content = readFileSync(path.join(fixturesDir, "claude-release-notes.html"), "utf8");
    const updates = parseClaudeReleaseNotes(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Claude");
    expect(updates[0].title).toContain("Claude");
  });

  it("parses Gemini updates from the Workspace Updates RSS feed", () => {
    const content = readFileSync(path.join(fixturesDir, "gemini-updates-rss.xml"), "utf8");
    const updates = parseGeminiFeed(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Gemini");
  });

  it("parses Notion AI releases from the official releases page", () => {
    const content = readFileSync(path.join(fixturesDir, "notion-releases.html"), "utf8");
    const updates = parseNotionReleases(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Notion AI");
  });

  it("parses Cursor changelog entries from the official changelog", () => {
    const content = readFileSync(path.join(fixturesDir, "cursor-changelog.html"), "utf8");
    const updates = parseCursorChangelog(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Cursor");
  });

  it("parses Devin release note entries from the docs changelog", () => {
    const content = readFileSync(path.join(fixturesDir, "devin-release-notes.html"), "utf8");
    const updates = parseDevinReleaseNotes(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Devin");
  });

  it("parses Perplexity entries from the official docs changelog", () => {
    const content = readFileSync(
      path.join(fixturesDir, "perplexity-docs-changelog.html"),
      "utf8",
    );
    const updates = parsePerplexityDocsChangelog(content);

    expect(updates).toHaveLength(1);
    expect(updates[0].product).toBe("Perplexity");
  });

  it("parses Figma AI releases from the official release notes page", () => {
    const content = readFileSync(path.join(fixturesDir, "figma-release-notes.html"), "utf8");
    const updates = parseFigmaReleaseNotes(content);

    expect(updates).toHaveLength(2);
    expect(updates[0].product).toBe("Figma AI");
  });
});

describe("live providers", () => {
  it("prioritizes curated JSON when LIVE_UPDATES_URL style data is supplied", async () => {
    const provider = new CuratedJsonIntelligenceProvider(
      "https://example.com/live-updates.json",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            updates: [
              {
                id: "chatgpt-live",
                product: "ChatGPT",
                title: "ChatGPT ships live memory controls",
                body: "Teams can now tune memory sources.",
                publishedAt: "2026-04-07T10:00:00.000Z",
                source: "OpenAI release notes",
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }) as typeof fetch,
    );

    const updates = await provider.getRawUpdates();

    expect(updates).toHaveLength(1);
    expect(updates[0].product).toBe("ChatGPT");
  });

  it("returns live updates when at least one official source succeeds", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("openai.com/news/rss.xml")) {
        const content = readFileSync(path.join(fixturesDir, "openai-news-rss.xml"), "utf8");
        return new Response(content, {
          status: 200,
          headers: { "content-type": "application/rss+xml" },
        });
      }

      throw new Error("source offline");
    });

    const provider = new OfficialSourceIntelligenceProvider(fetchMock as typeof fetch);
    const updates = await provider.getRawUpdates();

    expect(updates.length).toBeGreaterThan(0);
    expect(provider.getSummary().succeeded).toBe(1);
    expect(provider.getSummary().failed).toBe(7);
    expect(provider.getSummary().sourceStatuses).toHaveLength(8);
    expect(
      provider.getSummary().sourceStatuses.find((status) => status.product === "ChatGPT")?.status,
    ).toBe("live");
  });
});
