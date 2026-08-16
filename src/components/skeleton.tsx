"use client";

// Simple pulse-opacity placeholder shape. Reuses existing radius/border/
// shadow conventions rather than introducing a new visual language — just
// an inert version of the real card shape while data is loading.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E8E6E0]/60 ${className}`} />;
}

// Matches RecipeCard's real dimensions (h-40 image + p-5 content block with
// title/description/button rows) so the swap-in from skeleton to real card
// doesn't jump the layout.
export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-soft">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-2 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    </div>
  );
}
