"use client";

import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/shared/badge";
import type { RunQuestionResponse } from "@/lib/intelligence/run-types";
import { formatShortDate } from "@/lib/intelligence/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const filteredTerms = Array.from(
    new Set(terms.map((term) => term.trim()).filter((term) => term.length >= 3)),
  ).sort((left, right) => right.length - left.length);

  if (filteredTerms.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${filteredTerms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const matched = filteredTerms.some(
          (term) => term.toLowerCase() === part.toLowerCase(),
        );

        return matched ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-[6px] bg-teal/12 px-1 py-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

export function RunQuestionAssistant({
  runId,
  evidenceCount,
  llmConfigured,
  suggestedQuestions,
}: {
  runId: string;
  evidenceCount: number;
  llmConfigured: boolean;
  suggestedQuestions: string[];
}) {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunQuestionResponse | null>(null);

  const helperText = useMemo(() => {
    if (evidenceCount === 0) {
      return "This run does not have enough captured evidence for run-scoped Q&A yet.";
    }

    return llmConfigured
      ? "Answers are grounded in this run's evidence set. If the model cannot support the answer with citations, the assistant falls back to retrieval-only mode."
      : "OPENAI_API_KEY is not configured, so the assistant will surface retrieved evidence and a deterministic summary instead of a generated answer.";
  }, [evidenceCount, llmConfigured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Enter a question before querying this run.");
      return;
    }

    setPending(true);
    setError(null);
    setSubmittedQuestion(question.trim());

    try {
      const response = await fetch(`/api/runs/${runId}/ask`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          question,
        }),
      });
      const payload = (await response.json()) as RunQuestionResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "The run assistant could not answer the question.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The run assistant could not answer the question.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">Run-scoped evidence</Badge>
        <Badge>{evidenceCount} snippets</Badge>
        <Badge tone={llmConfigured ? "signal" : "neutral"}>
          {llmConfigured ? "LLM enabled" : "Retrieval only by default"}
        </Badge>
      </div>

      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{helperText}</p>

      {evidenceCount === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border/80 bg-panel px-4 py-5 text-sm leading-6 text-muted-foreground">
          This run either predates evidence capture or did not produce reviewable official-source
          snippets. Run official ingestion again to generate a queryable evidence set.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuestion(suggestion)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-teal/30 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Ask this run about product direction, workflow movement, or which official sources support a claim."
              className="w-full rounded-[24px] border border-border/80 bg-panel px-5 py-4 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-teal/30"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-medium text-teal transition-colors hover:border-teal/30 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "Reviewing evidence..." : "Ask this run"}
              </button>
              {error ? <p className="text-sm text-amber-700">{error}</p> : null}
            </div>
          </form>
        </>
      )}

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              {result.generationMode === "llm" ? "LLM answer" : "Retrieval-only answer"}
            </Badge>
            <Badge>{result.retrievedCount} retrieved</Badge>
          </div>

          {result.warning ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
              {result.warning}
            </div>
          ) : null}

          {result.answer ? (
            <div className="rounded-[24px] border border-border/80 bg-panel px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Answer
              </p>
              <p className="mt-3 text-sm leading-7 text-panel-foreground">{result.answer}</p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-panel px-5 py-5 text-sm leading-6 text-muted-foreground">
              No confident answer could be produced from this run&apos;s evidence set.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Supporting evidence
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  These citations show why the assistant selected each source fragment for the
                  current question.
                </p>
              </div>
              {submittedQuestion ? (
                <div className="max-w-[26rem] rounded-[18px] border border-border/70 bg-surface px-4 py-3 text-right text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Question:</span> {submittedQuestion}
                </div>
              ) : null}
            </div>
            {result.citations.length > 0 ? (
              result.citations.map((citation) => (
                <div
                  key={citation.evidenceId}
                  className="rounded-[22px] border border-border/70 bg-panel px-4 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="signal">Evidence {citation.retrievalRank}</Badge>
                    <Badge>Score {citation.retrievalScore}</Badge>
                    <Badge tone="accent">{citation.product}</Badge>
                    <Badge>{citation.source}</Badge>
                    <Badge>{citation.category}</Badge>
                    <Badge>{citation.changeType}</Badge>
                  </div>
                  <p className="mt-3 text-base font-semibold text-foreground">
                    <HighlightedText text={citation.title} terms={citation.matchedTerms} />
                  </p>
                  <p className="mt-2 text-sm leading-7 text-panel-foreground">
                    <HighlightedText text={citation.snippet} terms={citation.matchedTerms} />
                  </p>
                  {citation.matchedTerms.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {citation.matchedTerms.map((term) => (
                        <span
                          key={term}
                          className="inline-flex items-center rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {citation.retrievalReasons.length > 0 ? (
                    <div className="mt-4 rounded-[18px] border border-border/60 bg-surface px-4 py-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        Why retrieved
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {citation.retrievalReasons.map((reason) => (
                          <span
                            key={reason}
                            className="inline-flex items-center rounded-full border border-border bg-panel px-3 py-1 text-xs text-panel-foreground"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {citation.focusTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {citation.focusTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-border/80 bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatShortDate(citation.publishedAt)}</span>
                    {citation.sourceUrl ? (
                      <a
                        href={citation.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal transition-colors hover:text-foreground"
                      >
                        Open source
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-panel px-4 py-5 text-sm leading-6 text-muted-foreground">
                No supporting evidence cards were returned for this question.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
