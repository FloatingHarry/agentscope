import { NextResponse } from "next/server";

import { executeResearchRun } from "@/lib/intelligence/research-run-agent";

export async function POST() {
  try {
    const run = await executeResearchRun();

    return NextResponse.json(
      {
        runId: run.runId,
        status: run.status,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Research run failed to start.",
      },
      {
        status: 500,
      },
    );
  }
}
