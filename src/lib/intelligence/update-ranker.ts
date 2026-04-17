import { REFERENCE_DATE } from "@/lib/intelligence/constants";
import type { NormalizedUpdate, RankedUpdate } from "@/lib/intelligence/types";
import { clamp, daysBetween } from "@/lib/intelligence/utils";

const categoryBoost: Record<NormalizedUpdate["category"], number> = {
  agent: 12,
  search: 10,
  memory: 9,
  workflow: 11,
  collaboration: 7,
  pricing: 6,
  "developer-tools": 8,
};

const changeTypeBoost: Record<NormalizedUpdate["changeType"], number> = {
  launch: 10,
  upgrade: 4,
  integration: 8,
  pricing: 5,
  expansion: 6,
  workflow: 7,
};

export function rankUpdates(
  updates: NormalizedUpdate[],
  referenceDate: Date = REFERENCE_DATE,
): RankedUpdate[] {
  return [...updates]
    .map((update) => {
      const publishedAt = new Date(update.publishedAt);
      const ageInDays = daysBetween(referenceDate, publishedAt);
      const recencyScore = clamp(18 - ageInDays * 0.9, 2, 18);
      const score =
        update.importance * 12 +
        categoryBoost[update.category] +
        changeTypeBoost[update.changeType] +
        recencyScore;

      const recencyBucket: RankedUpdate["recencyBucket"] =
        ageInDays <= 7 ? "this-week" : ageInDays <= 14 ? "last-two-weeks" : "earlier";

      const rankReason = [
        `${update.importance}/5 importance`,
        `${update.category} emphasis`,
        ageInDays <= 7 ? "fresh signal" : "still within active window",
      ];

      return {
        ...update,
        score: Math.round(score),
        rankReason,
        recencyBucket,
      };
    })
    .sort((left, right) => {
      return right.score - left.score || Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
}
