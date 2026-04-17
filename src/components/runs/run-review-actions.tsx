"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import type { RunStatus } from "@/lib/intelligence/run-types";

export function RunReviewActions({
  runId,
  status,
}: {
  runId: string;
  status: RunStatus;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"publish" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status !== "review_required") {
    return null;
  }

  async function submit(action: "publish" | "reject") {
    setError(null);
    setPendingAction(action);

    try {
      const response = await fetch(`/api/runs/${runId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Could not ${action} the run.`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : `Could not ${action} the run.`,
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submit("publish")}
          disabled={Boolean(pendingAction) || isPending}
          className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-medium text-teal transition-colors hover:border-teal/30 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "publish" ? "Publishing..." : "Publish reviewed run"}
        </button>
        <button
          type="button"
          onClick={() => submit("reject")}
          disabled={Boolean(pendingAction) || isPending}
          className="rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "reject" ? "Rejecting..." : "Reject run"}
        </button>
      </div>
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </div>
  );
}
