import type {
  PreparedUpdate,
  RawUpdate,
  TrackedProduct,
} from "@/lib/intelligence/types";

const leadingVerbs = [
  "launches",
  "adds",
  "rolls out",
  "introduces",
  "opens",
  "expands",
  "ships",
  "improves",
  "updates",
  "refreshes",
];

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractFeatureName(title: string) {
  const lowerTitle = title.toLowerCase();
  const matchedVerb = leadingVerbs.find((verb) => lowerTitle.includes(` ${verb} `));

  if (!matchedVerb) {
    return title;
  }

  const [, featureCandidate] = lowerTitle.split(` ${matchedVerb} `);
  const featureName = featureCandidate?.trim();

  if (!featureName) {
    return title;
  }

  return featureName.replace(/^\w/, (letter) => letter.toUpperCase());
}

function buildExcerpt(body: string) {
  const firstSentence = body.split(".")[0]?.trim();
  return firstSentence ? `${firstSentence}.` : body;
}

export function normalizeRawUpdates(
  updates: RawUpdate[],
  products: TrackedProduct[],
): PreparedUpdate[] {
  const productSlugMap = new Map(
    products.map((product) => [product.name.toLowerCase(), product.slug]),
  );

  return updates.map((update) => {
    const productSlug =
      productSlugMap.get(update.product.toLowerCase()) ?? normalizeSlug(update.product);

    return {
      ...update,
      productSlug,
      featureName: extractFeatureName(update.title),
      excerpt: buildExcerpt(update.body),
      searchableText: `${update.title} ${update.body}`.toLowerCase(),
    };
  });
}
