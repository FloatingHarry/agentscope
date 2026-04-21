import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/intelligence/constants";
import type {
  ResearchRun,
  RunEvidence,
  RunQuestionCitation,
  RunQuestionResponse,
} from "@/lib/intelligence/run-types";
import { sentenceList } from "@/lib/intelligence/utils";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const MAX_RETRIEVED_EVIDENCE = 5;
const OPENAI_TIMEOUT_MS = 15000;

const STOPWORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "by",
  "did",
  "do",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "recent",
  "recently",
  "run",
  "show",
  "showed",
  "shown",
  "support",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "was",
  "what",
  "which",
  "who",
  "why",
]);

type RetrievedRunEvidence = RunEvidence & {
  retrievalScore: number;
  matchedTerms: string[];
  retrievalReasons: string[];
};

type LlmRunAnswer = {
  answer: string;
  citationEvidenceIds: string[];
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildCitation(
  evidence: RetrievedRunEvidence,
  retrievalRank: number,
): RunQuestionCitation {
  return {
    evidenceId: evidence.evidenceId,
    retrievalRank,
    retrievalScore: evidence.retrievalScore,
    source: evidence.source,
    sourceUrl: evidence.sourceUrl,
    product: evidence.product,
    title: evidence.title,
    snippet: evidence.snippet,
    publishedAt: evidence.publishedAt,
    category: evidence.category,
    changeType: evidence.changeType,
    focusTags: evidence.focusTags,
    matchedTerms: evidence.matchedTerms,
    retrievalReasons: evidence.retrievalReasons,
  };
}

function detectProductFilters(run: ResearchRun, question: string) {
  const normalizedQuestion = normalizeText(question);

  return new Set(
    run.products
      .filter((product) => {
        return (
          normalizedQuestion.includes(normalizeText(product.name)) ||
          normalizedQuestion.includes(normalizeText(product.slug))
        );
      })
      .map((product) => product.name),
  );
}

function detectCategoryFilters(question: string) {
  const normalizedQuestion = normalizeText(question);

  return new Set(
    CATEGORY_ORDER.filter((category) => {
      const label = CATEGORY_META[category].label;
      return (
        normalizedQuestion.includes(normalizeText(category)) ||
        normalizedQuestion.includes(normalizeText(label))
      );
    }),
  );
}

function detectSourceFilters(evidence: RunEvidence[], question: string) {
  const normalizedQuestion = normalizeText(question);

  return new Set(
    unique(evidence.map((item) => item.source)).filter((source) => {
      return normalizedQuestion.includes(normalizeText(source));
    }),
  );
}

function evaluateEvidenceMatch(
  evidence: RunEvidence,
  questionTerms: string[],
  productFilters: Set<string>,
  categoryFilters: Set<string>,
  sourceFilters: Set<string>,
) {
  if (productFilters.size > 0 && !productFilters.has(evidence.product)) {
    return {
      retrievalScore: -1,
      matchedTerms: [],
      retrievalReasons: [],
    };
  }

  if (sourceFilters.size > 0 && !sourceFilters.has(evidence.source)) {
    return {
      retrievalScore: -1,
      matchedTerms: [],
      retrievalReasons: [],
    };
  }

  let score = 0;
  const title = normalizeText(evidence.title);
  const snippet = normalizeText(evidence.snippet);
  const matchedTerms: string[] = [];
  const retrievalReasons: string[] = [];

  if (productFilters.has(evidence.product)) {
    score += 7;
    retrievalReasons.push(`product match: ${evidence.product}`);
  }

  if (sourceFilters.has(evidence.source)) {
    score += 6;
    retrievalReasons.push(`source match: ${evidence.source}`);
  }

  if (categoryFilters.has(evidence.category)) {
    score += 5;
    retrievalReasons.push(
      `category match: ${CATEGORY_META[evidence.category].label.toLowerCase()}`,
    );
  }

  for (const tag of evidence.focusTags) {
    if (categoryFilters.has(tag)) {
      score += 2;
      if (tag in CATEGORY_META) {
        retrievalReasons.push(
          `focus tag match: ${CATEGORY_META[tag as keyof typeof CATEGORY_META].label.toLowerCase()}`,
        );
      }
    }
  }

  for (const term of questionTerms) {
    if (title.includes(term)) {
      score += 4;
      matchedTerms.push(term);
      continue;
    }

    if (snippet.includes(term)) {
      score += 2;
      matchedTerms.push(term);
      continue;
    }

    if (evidence.retrievalText.includes(term)) {
      score += 1;
    }
  }

  if (matchedTerms.length > 0) {
    retrievalReasons.push(`term match: ${sentenceList(unique(matchedTerms).slice(0, 4))}`);
  }

  if (score > 0) {
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - Date.parse(evidence.publishedAt)) / (1000 * 60 * 60 * 24)),
    );
    score += Math.max(0, 3 - Math.floor(ageDays / 14));
  }

  return {
    retrievalScore: score,
    matchedTerms: unique(matchedTerms),
    retrievalReasons: unique(retrievalReasons),
  };
}

export function retrieveRunEvidence(run: ResearchRun, question: string) {
  const questionTerms = tokenize(question);
  const productFilters = detectProductFilters(run, question);
  const categoryFilters = detectCategoryFilters(question);
  const sourceFilters = detectSourceFilters(run.evidence, question);

  const retrieved = run.evidence
    .map((evidence) => {
      const match = evaluateEvidenceMatch(
        evidence,
        questionTerms,
        productFilters,
        categoryFilters,
        sourceFilters,
      );

      return {
        ...evidence,
        retrievalScore: match.retrievalScore,
        matchedTerms: match.matchedTerms,
        retrievalReasons: match.retrievalReasons,
      };
    })
    .filter((evidence) => evidence.retrievalScore >= 3)
    .sort((left, right) => {
      return (
        right.retrievalScore - left.retrievalScore ||
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
      );
    })
    .slice(0, MAX_RETRIEVED_EVIDENCE);

  return retrieved;
}

function buildRetrievalOnlyAnswer(question: string, evidence: RetrievedRunEvidence[]) {
  if (evidence.length === 0) {
    return null;
  }

  if (evidence.length === 1) {
    const item = evidence[0];
    return `Retrieval-only mode is active. The strongest matching evidence in this run is ${item.product}'s "${item.title}" from ${item.source}. Review the citation below for the exact source wording related to "${question.trim()}".`;
  }

  const products = unique(evidence.map((item) => item.product)).slice(0, 3);
  const categories = unique(
    evidence.map((item) => CATEGORY_META[item.category].label.toLowerCase()),
  ).slice(0, 2);

  return `Retrieval-only mode is active, so this answer is based on the strongest evidence matches captured in this run. The top supporting snippets point to ${sentenceList(products)}${categories.length > 0 ? `, especially around ${sentenceList(categories)} signals` : ""}. Review the citations below for the exact official source phrasing.`;
}

function createInsufficientEvidenceResponse(): RunQuestionResponse {
  return {
    answer: null,
    citations: [],
    retrievedCount: 0,
    generationMode: "retrieval-only",
    warning: "Insufficient evidence in this run to answer confidently.",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractResponseText(payload: unknown) {
  if (isRecord(payload) && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!isRecord(payload) || !Array.isArray(payload.output)) {
    return null;
  }

  const chunks: string[] = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join("").trim() : null;
}

function parseLlmRunAnswer(payload: unknown): LlmRunAnswer {
  const text = extractResponseText(payload);

  if (!text) {
    throw new Error("OpenAI response did not include structured answer text.");
  }

  const parsed = JSON.parse(text) as unknown;

  if (
    !isRecord(parsed) ||
    typeof parsed.answer !== "string" ||
    !Array.isArray(parsed.citationEvidenceIds) ||
    parsed.citationEvidenceIds.some((item) => typeof item !== "string")
  ) {
    throw new Error("OpenAI response did not match the expected answer schema.");
  }

  return {
    answer: parsed.answer.trim(),
    citationEvidenceIds: parsed.citationEvidenceIds,
  };
}

async function requestOpenAiRunAnswer(
  question: string,
  evidence: RetrievedRunEvidence[],
  fetchImpl: typeof fetch,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const evidenceContext = evidence
    .map((item, index) => {
      return [
        `Evidence ${index + 1}`,
        `Evidence ID: ${item.evidenceId}`,
        `Product: ${item.product}`,
        `Source: ${item.source}`,
        `Published at: ${item.publishedAt}`,
        `Title: ${item.title}`,
        `Snippet: ${item.snippet}`,
        `Category: ${CATEGORY_META[item.category].label}`,
        `Source URL: ${item.sourceUrl || "Unavailable"}`,
      ].join("\n");
    })
    .join("\n\n");

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "You are a product-intelligence review assistant.",
                "Answer only from the provided evidence snippets.",
                "If the evidence is not enough, answer exactly: Insufficient evidence in this run to answer confidently.",
                "Keep the answer concise and cite only evidence IDs that directly support the answer.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Question:\n${question.trim()}\n\nEvidence set:\n${evidenceContext}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "run_question_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: {
                type: "string",
              },
              citationEvidenceIds: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            required: ["answer", "citationEvidenceIds"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    let message = `OpenAI request failed with status ${response.status}.`;

    try {
      const payload = (await response.json()) as unknown;
      if (
        isRecord(payload) &&
        isRecord(payload.error) &&
        typeof payload.error.message === "string"
      ) {
        message = payload.error.message;
      }
    } catch {
      // Ignore JSON parsing errors and preserve the generic message.
    }

    throw new Error(message);
  }

  return parseLlmRunAnswer(await response.json());
}

export async function answerRunQuestion(
  run: ResearchRun,
  question: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<RunQuestionResponse> {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    return {
      answer: null,
      citations: [],
      retrievedCount: 0,
      generationMode: "retrieval-only",
      warning: "A question is required before this run can be queried.",
    };
  }

  const retrieved = retrieveRunEvidence(run, trimmedQuestion);

  if (retrieved.length === 0) {
    return createInsufficientEvidenceResponse();
  }

  const fallbackCitations = retrieved.map((evidence, index) => buildCitation(evidence, index + 1));
  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const llmAnswer = await requestOpenAiRunAnswer(trimmedQuestion, retrieved, fetchImpl);

    if (!llmAnswer) {
      return {
        answer: buildRetrievalOnlyAnswer(trimmedQuestion, retrieved),
        citations: fallbackCitations,
        retrievedCount: retrieved.length,
        generationMode: "retrieval-only",
        warning: "OPENAI_API_KEY is not configured. Showing retrieved evidence only.",
      };
    }

    const citationMap = new Map(retrieved.map((item) => [item.evidenceId, item]));
    const selectedCitations = unique(llmAnswer.citationEvidenceIds)
      .map((evidenceId) => citationMap.get(evidenceId))
      .filter((item): item is RetrievedRunEvidence => Boolean(item))
      .map((evidence) => {
        const retrievalRank =
          retrieved.findIndex((item) => item.evidenceId === evidence.evidenceId) + 1;

        return buildCitation(evidence, retrievalRank);
      });

    if (selectedCitations.length === 0) {
      return {
        answer: buildRetrievalOnlyAnswer(trimmedQuestion, retrieved),
        citations: fallbackCitations,
        retrievedCount: retrieved.length,
        generationMode: "retrieval-only",
        warning:
          "The generated answer did not cite valid run evidence, so the assistant fell back to retrieval-only mode.",
      };
    }

    const answer =
      llmAnswer.answer.trim() === "Insufficient evidence in this run to answer confidently."
        ? null
        : llmAnswer.answer.trim();

    return {
      answer,
      citations: selectedCitations,
      retrievedCount: retrieved.length,
      generationMode: "llm",
      warning:
        answer === null
          ? "Insufficient evidence in this run to answer confidently."
          : undefined,
    };
  } catch (error) {
    return {
      answer: buildRetrievalOnlyAnswer(trimmedQuestion, retrieved),
      citations: fallbackCitations,
      retrievedCount: retrieved.length,
      generationMode: "retrieval-only",
      warning: `OpenAI generation failed, so the assistant fell back to retrieval-only mode. ${error instanceof Error ? error.message : "Unknown generation error."}`,
    };
  }
}
