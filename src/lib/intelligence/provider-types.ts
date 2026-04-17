import type { RawUpdate, TrackedProduct } from "@/lib/intelligence/types";

export interface IntelligenceProvider {
  name: string;
  getProducts(): Promise<TrackedProduct[]>;
  getRawUpdates(): Promise<RawUpdate[]>;
}
