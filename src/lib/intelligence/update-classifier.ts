import { CATEGORY_ORDER } from "@/lib/intelligence/constants";
import type {
  CategoryKey,
  ChangeType,
  NormalizedUpdate,
  PreparedUpdate,
} from "@/lib/intelligence/types";
import { clamp } from "@/lib/intelligence/utils";

const categoryRules: Record<CategoryKey, string[]> = {
  agent: [
    "agent",
    "operator",
    "autonomous",
    "playbook",
    "background",
    "delegate",
    "multi-step",
  ],
  search: [
    "search",
    "research",
    "source",
    "discover",
    "answer",
    "lookup",
    "compare",
  ],
  memory: [
    "memory",
    "persistent",
    "recall",
    "retain",
    "history",
    "context",
    "reusable",
  ],
  workflow: [
    "workflow",
    "project",
    "brief",
    "canvas",
    "task",
    "automation",
    "workspace",
    "planning",
  ],
  collaboration: [
    "team",
    "shared",
    "collaboration",
    "review",
    "handoff",
    "comment",
    "approve",
    "co-edit",
  ],
  pricing: [
    "pricing",
    "price",
    "tier",
    "seat",
    "credits",
    "plan",
    "usage-based",
    "budgeted",
  ],
  "developer-tools": [
    "developer",
    "coding",
    "repo",
    "repository",
    "cli",
    "terminal",
    "sdk",
    "api",
    "ide",
    "code",
  ],
};

const changeTypeRules: Array<{ type: ChangeType; matches: string[] }> = [
  {
    type: "pricing",
    matches: ["pricing", "plan", "seat", "credit", "tier", "usage-based"],
  },
  {
    type: "integration",
    matches: ["connector", "api", "gallery", "cross-app", "shared source"],
  },
  {
    type: "launch",
    matches: ["launches", "introduces", "opens", "ships"],
  },
  {
    type: "expansion",
    matches: ["expands", "improves", "refreshes", "extends"],
  },
  {
    type: "workflow",
    matches: ["workflow", "project", "board", "brief", "handoff"],
  },
];

function scoreCategory(text: string, category: CategoryKey) {
  return categoryRules[category].reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
}

function pickCategory(update: PreparedUpdate) {
  const scores = CATEGORY_ORDER.map((category) => ({
    category,
    score: scoreCategory(update.searchableText, category),
  }));

  scores.sort((left, right) => right.score - left.score);

  if (scores[0]?.score === 0) {
    return "workflow" as const;
  }

  return scores[0].category;
}

function pickChangeType(text: string): ChangeType {
  const rule = changeTypeRules.find(({ matches }) =>
    matches.some((keyword) => text.includes(keyword)),
  );

  return rule?.type ?? "upgrade";
}

function buildFocusTags(update: PreparedUpdate, category: CategoryKey) {
  const focusTags = new Set<string>([category]);

  for (const [candidate, keywords] of Object.entries(categoryRules) as Array<
    [CategoryKey, string[]]
  >) {
    if (candidate === category) {
      continue;
    }

    if (keywords.some((keyword) => update.searchableText.includes(keyword))) {
      focusTags.add(candidate);
    }
  }

  return Array.from(focusTags).slice(0, 3);
}

function buildSignalPhrases(
  update: PreparedUpdate,
  category: CategoryKey,
  changeType: ChangeType,
) {
  const phrases = new Set<string>([
    `${category} move`,
    `${changeType} signal`,
    update.featureName,
  ]);

  if (update.searchableText.includes("team") || update.searchableText.includes("shared")) {
    phrases.add("team-facing rollout");
  }

  if (update.searchableText.includes("memory")) {
    phrases.add("persistent context");
  }

  if (update.searchableText.includes("workflow")) {
    phrases.add("workflow depth");
  }

  return Array.from(phrases).slice(0, 4);
}

function scoreImportance(
  update: PreparedUpdate,
  category: CategoryKey,
  changeType: ChangeType,
  focusTags: string[],
) {
  let importance = 2;

  if (["agent", "workflow", "memory"].includes(category)) {
    importance += 1;
  }

  if (["launch", "pricing", "integration"].includes(changeType)) {
    importance += 1;
  }

  if (
    update.searchableText.includes("enterprise") ||
    update.searchableText.includes("team") ||
    update.searchableText.includes("workspace")
  ) {
    importance += 1;
  }

  if (focusTags.length >= 3) {
    importance += 1;
  }

  return clamp(importance, 2, 5);
}

export function classifyUpdates(updates: PreparedUpdate[]): NormalizedUpdate[] {
  return updates.map((update) => {
    const category = pickCategory(update);
    const changeType = pickChangeType(update.searchableText);
    const focusTags = buildFocusTags(update, category);
    const importance = scoreImportance(update, category, changeType, focusTags);

    return {
      id: update.id,
      product: update.product,
      productSlug: update.productSlug,
      title: update.title,
      body: update.body,
      featureName: update.featureName,
      category,
      changeType,
      importance,
      publishedAt: update.publishedAt,
      source: update.source,
      excerpt: update.excerpt,
      focusTags,
      signalPhrases: buildSignalPhrases(update, category, changeType),
    };
  });
}
