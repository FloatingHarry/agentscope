"use client";

import { startTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/shared/badge";
import { cx } from "@/lib/cx";
import type { TrackedProduct } from "@/lib/intelligence/types";

export function CompareControls({
  products,
  selectedSlugs,
}: {
  products: TrackedProduct[];
  selectedSlugs: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateSelection(slug: string) {
    const currentlySelected = selectedSlugs.includes(slug);

    if (currentlySelected && selectedSlugs.length <= 2) {
      return;
    }

    if (!currentlySelected && selectedSlugs.length >= 3) {
      return;
    }

    const nextSlugs = currentlySelected
      ? selectedSlugs.filter((item) => item !== slug)
      : [...selectedSlugs, slug];

    const params = new URLSearchParams(searchParams.toString());
    params.set("products", nextSlugs.join(","));

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const selectedProducts = products.filter((product) =>
    selectedSlugs.includes(product.slug),
  );
  const selectionMessage =
    selectedSlugs.length === 2
      ? "Select one more product for a fuller market read, or stay with two for a tighter comparison."
      : "Maximum selected. Deselect one product to switch the comparison set.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-panel px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Current selection
          </p>
          <p className="mt-2 text-sm leading-6 text-panel-foreground">
            Comparing {selectedSlugs.length} of 3 slots. {selectionMessage}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map((product) => (
            <span
              key={product.slug}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: product.accent }}
              />
              {product.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {products.map((product) => {
          const selected = selectedSlugs.includes(product.slug);
          const disabled =
            (!selected && selectedSlugs.length >= 3) ||
            (selected && selectedSlugs.length <= 2);

          return (
            <button
              key={product.slug}
              type="button"
              onClick={() => updateSelection(product.slug)}
              disabled={disabled}
              aria-pressed={selected}
              className={cx(
                "flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-all",
                selected
                  ? "border-foreground bg-foreground text-white shadow-[0_12px_30px_rgba(23,33,38,0.18)]"
                  : "border-border bg-panel text-muted-foreground hover:border-foreground hover:text-foreground",
                disabled ? "cursor-not-allowed opacity-65" : "",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: product.accent }}
              />
              {product.name}
              {selected ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                  Selected
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <Badge tone="accent">
        Select between 2 and 3 products to compare shipping cadence and strategic focus
      </Badge>
    </div>
  );
}
