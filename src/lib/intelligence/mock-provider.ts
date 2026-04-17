import { TRACKED_PRODUCTS } from "@/lib/intelligence/constants";
import type { IntelligenceProvider } from "@/lib/intelligence/provider-types";
import { rawUpdates } from "@/lib/intelligence/raw-updates";

export class MockIntelligenceProvider implements IntelligenceProvider {
  name = "mock-intelligence-provider";

  async getProducts() {
    return TRACKED_PRODUCTS;
  }

  async getRawUpdates() {
    return rawUpdates;
  }
}

export const mockProvider = new MockIntelligenceProvider();
