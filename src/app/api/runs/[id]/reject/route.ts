import { NextResponse } from "next/server";

import { rejectResearchRun } from "@/lib/intelligence/run-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const run = await rejectResearchRun(id);

    return NextResponse.json({
      runId: run.runId,
      status: run.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not reject the run.",
      },
      {
        status: 400,
      },
    );
  }
}
