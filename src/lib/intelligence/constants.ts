import type {
  CategoryKey,
  FocusPillar,
  TrackedProduct,
} from "@/lib/intelligence/types";

export const REFERENCE_DATE = new Date("2026-04-09T12:00:00.000Z");

export const CATEGORY_ORDER: CategoryKey[] = [
  "agent",
  "search",
  "memory",
  "workflow",
  "collaboration",
  "pricing",
  "developer-tools",
];

export const FOCUS_PILLARS: FocusPillar[] = [
  "agent",
  "search",
  "memory",
  "workflow",
  "pricing",
];

export const DEFAULT_COMPARE_PRODUCT_SLUGS = [
  "chatgpt",
  "claude",
  "perplexity",
];

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; description: string; chartColor: string }
> = {
  agent: {
    label: "Agent",
    description: "Autonomous execution, delegation, and operator flows.",
    chartColor: "#138c8c",
  },
  search: {
    label: "Search",
    description: "Research, retrieval, discovery, and source-grounded answers.",
    chartColor: "#3f7bf7",
  },
  memory: {
    label: "Memory",
    description: "Persistent context, recall, and reusable project state.",
    chartColor: "#ff9e43",
  },
  workflow: {
    label: "Workflow",
    description: "Projects, canvases, briefs, automations, and task orchestration.",
    chartColor: "#7b61ff",
  },
  collaboration: {
    label: "Collaboration",
    description: "Shared review, handoffs, and team-facing controls.",
    chartColor: "#4cae73",
  },
  pricing: {
    label: "Pricing",
    description: "Plan, seat, credit, and packaging changes.",
    chartColor: "#d08d26",
  },
  "developer-tools": {
    label: "Developer Tools",
    description: "APIs, IDE surfaces, SDKs, terminals, and engineering flows.",
    chartColor: "#6e7582",
  },
};

export const TRACKED_PRODUCTS: TrackedProduct[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    company: "OpenAI",
    segment: "AI assistant suite",
    positioning: "Leaning into orchestrated workflows for knowledge workers.",
    pricingModel: "Freemium + Team + Enterprise",
    description:
      "A broad AI workspace that increasingly blends search, memory, and agentic execution.",
    recentBias: ["agent", "workflow", "memory"],
    accent: "#10a39a",
  },
  {
    slug: "claude",
    name: "Claude",
    company: "Anthropic",
    segment: "Research and writing assistant",
    positioning: "Strong on safe research workflows and structured team usage.",
    pricingModel: "Pro + Team + Enterprise",
    description:
      "A deliberate product focused on high-trust research, writing, and coding collaboration.",
    recentBias: ["search", "workflow", "memory"],
    accent: "#5d83ff",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    company: "Perplexity",
    segment: "Answer engine",
    positioning: "Search-led intelligence product with deeper analyst workflows.",
    pricingModel: "Free + Pro + Enterprise",
    description:
      "A fast-moving research product expanding from search into ongoing intelligence workflows.",
    recentBias: ["search", "memory", "workflow"],
    accent: "#10817a",
  },
  {
    slug: "notion-ai",
    name: "Notion AI",
    company: "Notion",
    segment: "Workspace AI",
    positioning: "Embedding AI into existing project and knowledge operations.",
    pricingModel: "Workspace add-on + Enterprise",
    description:
      "A workflow-centric AI layer for project docs, meeting follow-through, and team knowledge.",
    recentBias: ["workflow", "memory", "collaboration"],
    accent: "#202736",
  },
  {
    slug: "cursor",
    name: "Cursor",
    company: "Anysphere",
    segment: "AI coding environment",
    positioning: "Developer-first product that is moving from coding assistant to agentic IDE.",
    pricingModel: "Pro + Teams + Enterprise",
    description:
      "An AI-native coding workspace with strong momentum in background tasks and codebase memory.",
    recentBias: ["developer-tools", "agent", "memory"],
    accent: "#2f7df6",
  },
  {
    slug: "devin",
    name: "Devin",
    company: "Cognition",
    segment: "Autonomous software agent",
    positioning: "Agent-led delivery product focused on engineering throughput.",
    pricingModel: "Usage-based + Enterprise",
    description:
      "An engineering agent product emphasizing task execution, sprint coverage, and reviewer handoffs.",
    recentBias: ["agent", "workflow", "developer-tools"],
    accent: "#c96f36",
  },
  {
    slug: "gemini",
    name: "Gemini",
    company: "Google",
    segment: "Consumer and workspace AI",
    positioning: "Cross-surface product stitching together search, agent actions, and workspaces.",
    pricingModel: "Free + Advanced + Workspace",
    description:
      "A broad AI surface combining Google ecosystem reach with increasingly actionable workflows.",
    recentBias: ["workflow", "search", "agent"],
    accent: "#4479ff",
  },
  {
    slug: "figma-ai",
    name: "Figma AI",
    company: "Figma",
    segment: "Design workflow AI",
    positioning: "Design-system intelligence with stronger collaboration and critique loops.",
    pricingModel: "Seat-based + Org plans",
    description:
      "A design-focused AI product pushing toward team critique, automation, and design-to-code workflows.",
    recentBias: ["workflow", "collaboration", "agent"],
    accent: "#b45d38",
  },
];
