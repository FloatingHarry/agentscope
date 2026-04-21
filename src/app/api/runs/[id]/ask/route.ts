import { NextResponse } from "next/server";

import { answerRunQuestion } from "@/lib/intelligence/run-question-answering";
import { getResearchRun } from "@/lib/intelligence/run-store";
import type { RunQuestionRequest } from "@/lib/intelligence/run-types";

function isRunQuestionRequest(value: unknown): value is RunQuestionRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RunQuestionRequest).question === "string"
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = await getResearchRun(id);

  if (!run) {
    return NextResponse.json(
      {
        error: "Research run not found.",
      },
      {
        status: 404,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (!isRunQuestionRequest(payload) || payload.question.trim().length === 0) {
    return NextResponse.json(
      {
        error: "A non-empty question is required.",
      },
      {
        status: 400,
      },
    );
  }

  const response = await answerRunQuestion(run, payload.question);

  return NextResponse.json(response, {
    headers: {
      "x-run-answer-mode": response.generationMode,
    },
  });
}
