"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionButton } from "@/components/motion-button";
import { LoadingOrb } from "@/components/loading-orb";

export type CookbookSummary = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  recipeCount: number;
};

export function CookbooksSection({ cookbooks }: { cookbooks: CookbookSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCookbook() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cookbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong creating your cookbook.");
        return;
      }
      setName("");
      setCreating(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-[#101010]">My cookbooks</h2>
      <p className="mt-1 text-sm text-[#6B7370]">
        Public — visible to other signed-in users. Only recipes you&apos;ve cooked can be added.
      </p>

      {cookbooks.length === 0 && !creating ? (
        <p className="mt-4 text-sm text-[#6B7370]">
          You haven&apos;t made a cookbook yet. Create one to start collecting your cooked recipes.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cookbooks.map((cookbook) => (
            <Link
              key={cookbook.id}
              href={`/profile/cookbooks/${cookbook.id}`}
              className="flex items-center gap-4 overflow-hidden rounded-[100px] border border-[#E8E6E0] bg-white p-4 shadow-soft transition hover:shadow-lifted"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[100px] bg-[#EDF3EF] text-xs text-[#6B7370]">
                {cookbook.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cookbook.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "No cover"
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#101010]">{cookbook.name}</p>
                <p className="mt-1 text-xs text-[#6B7370]">
                  {cookbook.recipeCount} {cookbook.recipeCount === 1 ? "recipe" : "recipes"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating ? (
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cookbook name"
            className="w-full max-w-xs rounded-[100px] border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
          <MotionButton
            type="button"
            onClick={createCookbook}
            disabled={saving || !name.trim()}
            className="shrink-0 rounded-[100px] bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white shadow-brand transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
          >
            {saving ? <LoadingOrb size={20} theme="dark" /> : "Create"}
          </MotionButton>
          <MotionButton
            type="button"
            onClick={() => {
              setCreating(false);
              setError(null);
              setName("");
            }}
            className="shrink-0 rounded-[100px] border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#101010] shadow-brand"
          >
            Cancel
          </MotionButton>
        </div>
      ) : (
        <MotionButton
          type="button"
          onClick={() => setCreating(true)}
          className="mt-4 rounded-[100px] border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#101010] shadow-brand"
        >
          + New cookbook
        </MotionButton>
      )}
      {error && <p className="mt-2 text-sm text-[#B23A32]">{error}</p>}
    </div>
  );
}
