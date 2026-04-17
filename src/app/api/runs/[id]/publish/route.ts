import { NextResponse } from "next/server";

import { publishResearchRun } from "@/lib/intelligence/run-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const run = await publishResearchRun(id);

    return NextResponse.json({
      runId: run.runId,
      status: run.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not publish the run.",
      },
      {
        status: 400,
      },
    );
  }
}
