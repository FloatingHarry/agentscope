import { Badge } from "@/components/shared/badge";
import type { RunStatus } from "@/lib/intelligence/run-types";

const statusToneMap: Record<RunStatus, "neutral" | "accent" | "signal"> = {
  running: "neutral",
  review_required: "accent",
  published: "accent",
  rejected: "signal",
  failed: "signal",
};

const statusLabelMap: Record<RunStatus, string> = {
  running: "Running",
  review_required: "Review required",
  published: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={statusToneMap[status]}>{statusLabelMap[status]}</Badge>;
}
