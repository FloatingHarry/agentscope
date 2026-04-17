import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import type { IntelligenceProvider } from "@/lib/intelligence/provider-types";
import type { IntelligenceSourceStatus } from "@/lib/intelligence/runtime";
import type { RawUpdate } from "@/lib/intelligence/types";

const LIVE_UPDATE_WINDOW_DAYS = 45;
const MAX_UPDATES_PER_PRODUCT = 6;
const SOURCE_TIMEOUT_MS = 5000;

type LiveUpdatesPayload = {
  updates: RawUpdate[];
};

type SourceContentType =
  | "rss"
  | "release-cards"
  | "dated-article"
  | "mintlify-updates";

type OfficialSourceParser = (content: string) => RawUpdate[];

type OfficialSourceConfig = {
  product: RawUpdate["product"];
  url: string;
  source: string;
  contentType: SourceContentType;
  acceptHeader: string;
  parser: OfficialSourceParser;
};

export type OfficialSourceSummary = {
  attempted: number;
  succeeded: number;
  failed: number;
  activeSources: string[];
  failedSources: string[];
  sourceStatuses: IntelligenceSourceStatus[];
};

const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const officialSourceConfigs: OfficialSourceConfig[] = [
  {
    product: "ChatGPT",
    url: "https://openai.com/news/rss.xml",
    source: "OpenAI News RSS",
    contentType: "rss",
    acceptHeader: "application/rss+xml, application/xml, text/xml",
    parser: parseOpenAiFeed,
  },
  {
    product: "Claude",
    url: "https://support.claude.com/en/articles/12138966-release-notes",
    source: "Claude Help Center",
    contentType: "dated-article",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parseClaudeReleaseNotes,
  },
  {
    product: "Perplexity",
    url: "https://docs.perplexity.ai/docs/resources/changelog",
    source: "Perplexity API Docs",
    contentType: "mintlify-updates",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parsePerplexityDocsChangelog,
  },
  {
    product: "Notion AI",
    url: "https://www.notion.com/releases",
    source: "Notion Releases",
    contentType: "release-cards",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parseNotionReleases,
  },
  {
    product: "Cursor",
    url: "https://cursor.com/changelog",
    source: "Cursor Changelog",
    contentType: "dated-article",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parseCursorChangelog,
  },
  {
    product: "Devin",
    url: "https://docs.devin.ai/release-notes",
    source: "Devin Docs",
    contentType: "mintlify-updates",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parseDevinReleaseNotes,
  },
  {
    product: "Gemini",
    url: "https://workspaceupdates.googleblog.com/feeds/posts/default/-/Gemini?alt=rss",
    source: "Google Workspace Updates",
    contentType: "rss",
    acceptHeader: "application/rss+xml, application/xml, text/xml",
    parser: parseGeminiFeed,
  },
  {
    product: "Figma AI",
    url: "https://www.figma.com/release-notes/",
    source: "Figma Release Notes",
    contentType: "release-cards",
    acceptHeader: "text/html,application/xhtml+xml",
    parser: parseFigmaReleaseNotes,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRawUpdate(value: unknown): value is RawUpdate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.product === "string" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.publishedAt === "string" &&
    typeof value.source === "string"
  );
}

function parsePayload(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.updates)) {
    throw new Error("Live updates payload must match { updates: RawUpdate[] }.");
  }

  return payload as LiveUpdatesPayload;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => {
      return String.fromCharCode(Number(code));
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      return String.fromCharCode(Number.parseInt(code, 16));
    })
    .replace(/&([a-z]+);/gi, (match, entity) => {
      return htmlEntityMap[entity.toLowerCase()] ?? match;
    });
}

function stripTags(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toIsoDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildStableId(product: string, publishedAt: string, title: string) {
  return `${slugify(product)}-${publishedAt.slice(0, 10)}-${slugify(title)}`;
}

function buildRawUpdate(
  product: string,
  title: string,
  body: string,
  publishedAt: string,
  source: string,
) {
  return {
    id: buildStableId(product, publishedAt, title),
    product,
    title,
    body,
    publishedAt,
    source,
  } satisfies RawUpdate;
}

function getProductSlug(productName: string) {
  return (
    TRACKED_PRODUCTS.find((product) => product.name === productName)?.slug ??
    slugify(productName)
  );
}

function withinRecentWindow(publishedAt: string, referenceDate = new Date()) {
  const age = referenceDate.getTime() - new Date(publishedAt).getTime();
  const ageInDays = age / (1000 * 60 * 60 * 24);
  return ageInDays <= LIVE_UPDATE_WINDOW_DAYS;
}

function dedupeUpdates(updates: RawUpdate[]) {
  const seen = new Set<string>();

  return updates.filter((update) => {
    if (seen.has(update.id)) {
      return false;
    }

    seen.add(update.id);
    return true;
  });
}

function takeRecentProductUpdates(updates: RawUpdate[]) {
  const recent = dedupeUpdates(
    updates
      .filter((update) => withinRecentWindow(update.publishedAt))
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)),
  );

  return recent.slice(0, MAX_UPDATES_PER_PRODUCT);
}

function extractXmlTag(content: string, tagName: string) {
  const match = content.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function extractRssItems(content: string) {
  return Array.from(content.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => match[1]);
}

function matchesAnyKeyword(value: string, keywords: string[]) {
  const candidate = value.toLowerCase();
  return keywords.some((keyword) => candidate.includes(keyword));
}

function parseKeywordFilteredRssFeed(
  content: string,
  product: string,
  source: string,
  keywords: string[],
) {
  const updates = extractRssItems(content)
    .map((item) => {
      const title = extractXmlTag(item, "title");
      const body = extractXmlTag(item, "description");
      const publishedAt = toIsoDate(extractXmlTag(item, "pubDate"));

      if (!title || !body || !publishedAt) {
        return null;
      }

      if (!matchesAnyKeyword(`${title} ${body}`, keywords)) {
        return null;
      }

      return buildRawUpdate(product, title, body, publishedAt, source);
    })
    .filter((update): update is RawUpdate => Boolean(update));

  return takeRecentProductUpdates(updates);
}

function parseMintlifyUpdates(content: string, product: string, source: string) {
  const sections = content.split(/<div class="update\b/i).slice(1);
  const updates: RawUpdate[] = [];

  for (const section of sections) {
    const label = section.match(/data-component-part="update-label">([^<]+)</i)?.[1];
    const publishedAt = label ? toIsoDate(stripTags(label)) : null;

    if (!publishedAt || !withinRecentWindow(publishedAt)) {
      continue;
    }

    const paragraphs = Array.from(
      section.matchAll(/<span data-as="p">([\s\S]*?)<\/span>/gi),
      (entry) => stripTags(entry[1]),
    ).filter(Boolean);

    const title = paragraphs[0];
    const body = paragraphs[1] ?? paragraphs[0];

    if (!title || !body) {
      continue;
    }

    updates.push(buildRawUpdate(product, title, body, publishedAt, source));
  }

  return takeRecentProductUpdates(updates);
}

function parseReleaseCardEntries(
  content: string,
  product: string,
  source: string,
  options?: {
    sectionSplitPattern?: RegExp;
    datePattern?: RegExp;
    titlePattern?: RegExp;
    bodyPattern?: RegExp;
    keywords?: string[];
  },
) {
  const sections = content
    .split(options?.sectionSplitPattern ?? /<article\b/gi)
    .slice(1);
  const updates: RawUpdate[] = [];

  for (const section of sections) {
    const rawDate = section.match(options?.datePattern ?? /<time[^>]*>([^<]+)<\/time>/i)?.[1];
    const rawTitle = section.match(options?.titlePattern ?? /<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
    const rawBody = section.match(options?.bodyPattern ?? /<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];

    const publishedAt = rawDate ? toIsoDate(stripTags(rawDate)) : null;
    const title = rawTitle ? stripTags(rawTitle) : "";
    const body = rawBody ? stripTags(rawBody) : "";

    if (!publishedAt || !title || !body) {
      continue;
    }

    if (options?.keywords && !matchesAnyKeyword(`${title} ${body}`, options.keywords)) {
      continue;
    }

    updates.push(buildRawUpdate(product, title, body, publishedAt, source));
  }

  return takeRecentProductUpdates(updates);
}

export function parseOpenAiFeed(content: string) {
  return parseKeywordFilteredRssFeed(content, "ChatGPT", "OpenAI News RSS", ["chatgpt"]);
}

export function parseGeminiFeed(content: string) {
  return parseKeywordFilteredRssFeed(
    content,
    "Gemini",
    "Google Workspace Updates",
    ["gemini"],
  );
}

export function parseClaudeReleaseNotes(content: string) {
  const articleMatch = content.match(/<article[\s\S]*?<\/article>/i);
  const article = articleMatch?.[0] ?? content;
  const dateMatches = Array.from(article.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi));
  const updates: RawUpdate[] = [];

  for (const [index, match] of dateMatches.entries()) {
    const publishedAt = toIsoDate(stripTags(match[1]));

    if (!publishedAt || !withinRecentWindow(publishedAt)) {
      continue;
    }

    const segmentStart = (match.index ?? 0) + match[0].length;
    const segmentEnd = dateMatches[index + 1]?.index ?? article.length;
    const segment = article.slice(segmentStart, segmentEnd);
    const paragraphs = Array.from(segment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), (entry) => {
      return stripTags(entry[1]);
    }).filter(Boolean);
    const title = paragraphs[0];
    const body = paragraphs[1] ?? paragraphs[0];

    if (!title || !body) {
      continue;
    }

    updates.push(buildRawUpdate("Claude", title, body, publishedAt, "Claude Help Center"));
  }

  return takeRecentProductUpdates(updates);
}

export function parsePerplexityDocsChangelog(content: string) {
  return parseMintlifyUpdates(content, "Perplexity", "Perplexity API Docs");
}

export function parseNotionReleases(content: string) {
  return parseReleaseCardEntries(content, "Notion AI", "Notion Releases", {
    sectionSplitPattern: /<article class="release_release__p2Jug">/gi,
    datePattern: /<time[^>]*>([^<]+)<\/time>/i,
    titlePattern: /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    bodyPattern: /<p[^>]*class="contentfulRichText_paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    keywords: ["ai", "notion ai", "q&a", "chat"],
  });
}

export function parseCursorChangelog(content: string) {
  const updates: RawUpdate[] = [];

  const matches = Array.from(
    content.matchAll(
      /<time dateTime="([^"]+)"[^>]*>[\s\S]*?<h1[^>]*>\s*<a[^>]*href="[^"]+"[^>]*>([\s\S]*?)<\/a>\s*<\/h1>[\s\S]*?<div class="prose prose--block">[\s\S]*?<p>([\s\S]*?)<\/p>/gi,
    ),
  );

  for (const match of matches) {
    const publishedAt = toIsoDate(match[1]);
    const title = stripTags(match[2]);
    const body = stripTags(match[3]);

    if (!publishedAt || !title || !body) {
      continue;
    }

    updates.push(buildRawUpdate("Cursor", title, body, publishedAt, "Cursor Changelog"));
  }

  return takeRecentProductUpdates(updates);
}

export function parseDevinReleaseNotes(content: string) {
  return parseMintlifyUpdates(content, "Devin", "Devin Docs");
}

export function parseFigmaReleaseNotes(content: string) {
  return parseReleaseCardEntries(content, "Figma AI", "Figma Release Notes", {
    sectionSplitPattern: /<article aria-label="/gi,
    datePattern: /<time dateTime="([^"]+)"/i,
    titlePattern: /^([^"]+)"/,
    bodyPattern: /<p class="fig-440iwg">([\s\S]*?)<\/p>/i,
    keywords: ["ai", "weave", "make", "prompt", "generate", "model"],
  });
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  acceptHeader: string,
) {
  const response = await fetchImpl(url, {
    headers: {
      accept: acceptHeader,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}.`);
  }

  return response.text();
}

export class CuratedJsonIntelligenceProvider implements IntelligenceProvider {
  name = "curated-json-live-provider";

  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getProducts() {
    return TRACKED_PRODUCTS;
  }

  async getRawUpdates() {
    const response = await this.fetchImpl(this.url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Live updates request failed with status ${response.status}.`);
    }

    const payload = parsePayload(await response.json());
    const validProducts = new Set(
      TRACKED_PRODUCTS.map((product) => product.name.toLowerCase()),
    );

    const updates = payload.updates
      .filter(isRawUpdate)
      .filter((update) => validProducts.has(update.product.toLowerCase()))
      .sort((left, right) => {
        return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      });

    if (updates.length === 0) {
      throw new Error(
        "Live updates payload did not contain any valid tracked-product updates.",
      );
    }

    return updates;
  }
}

export class OfficialSourceIntelligenceProvider implements IntelligenceProvider {
  name = "official-source-live-provider";
  private summary: OfficialSourceSummary = {
    attempted: officialSourceConfigs.length,
    succeeded: 0,
    failed: officialSourceConfigs.length,
    activeSources: [],
    failedSources: [],
    sourceStatuses: [],
  };

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async getProducts() {
    return TRACKED_PRODUCTS;
  }

  getSummary() {
    return this.summary;
  }

  async getRawUpdates() {
    const settled = await Promise.allSettled(
      officialSourceConfigs.map(async (config) => {
        const content = await fetchWithTimeout(
          config.url,
          this.fetchImpl,
          config.acceptHeader,
        );
        const updates = config.parser(content).map((update) => ({
          ...update,
          source: config.source,
        }));

        if (updates.length === 0) {
          throw new Error(`${config.product} official source did not yield recent updates.`);
        }

        return {
          config,
          updates,
        };
      }),
    );

    const successful = settled.filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        config: OfficialSourceConfig;
        updates: RawUpdate[];
      }> => result.status === "fulfilled",
    );
    const failed = settled.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    this.summary = {
      attempted: officialSourceConfigs.length,
      succeeded: successful.length,
      failed: failed.length,
      activeSources: successful.map((result) => result.value.config.source),
      failedSources: failed.map((result) => toErrorMessage(result.reason)),
      sourceStatuses: officialSourceConfigs.map((config, index) => {
        const settledResult = settled[index];

        if (settledResult?.status === "fulfilled") {
          const latestPublishedAt = settledResult.value.updates[0]?.publishedAt;

          return {
            product: config.product,
            productSlug: getProductSlug(config.product),
            source: config.source,
            url: config.url,
            status: "live",
            updateCount: settledResult.value.updates.length,
            latestPublishedAt,
          } satisfies IntelligenceSourceStatus;
        }

        return {
          product: config.product,
          productSlug: getProductSlug(config.product),
          source: config.source,
          url: config.url,
          status: "failed",
          updateCount: 0,
          errorMessage: settledResult
            ? toErrorMessage(settledResult.reason)
            : `${config.product} official source failed.`,
        } satisfies IntelligenceSourceStatus;
      }),
    };

    const updates = successful.flatMap((result) => result.value.updates);

    if (updates.length === 0) {
      throw new Error(
        failed.map((result) => toErrorMessage(result.reason)).join(" | ") ||
          "All official live sources failed.",
      );
    }

    return updates.sort((left, right) => {
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown live source error";
}
