import { NextResponse } from "next/server";

import { getDashboardViewData } from "@/lib/intelligence/builders";
import { parseIntelligenceMode } from "@/lib/intelligence/runtime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = parseIntelligenceMode(searchParams.get("mode"));
  const { data, runtime } = await getDashboardViewData({ mode });

  return NextResponse.json(data, {
    headers: {
      "x-intelligence-mode": runtime.resolvedMode,
      "x-intelligence-requested-mode": runtime.requestedMode,
      "x-intelligence-fallback": runtime.fallbackReason ? "true" : "false",
      "x-intelligence-source": runtime.sourceVariant ?? "mock",
      "x-intelligence-source-count":
        runtime.sourceSuccessCount !== undefined && runtime.sourceAttemptCount !== undefined
          ? `${runtime.sourceSuccessCount}/${runtime.sourceAttemptCount}`
          : "n/a",
    },
  });
}
