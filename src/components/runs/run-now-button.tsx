"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

export function RunNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
      });
      const payload = (await response.json()) as { runId?: string; error?: string };

      if (!response.ok || !payload.runId) {
        throw new Error(payload.error ?? "Research run could not be started.");
      }

      startTransition(() => {
        router.push(`/runs/${payload.runId}`);
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Research run could not be started.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-medium text-teal transition-colors hover:border-teal/30 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Running official ingestion..." : "Run official ingestion now"}
      </button>
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </div>
  );
}
