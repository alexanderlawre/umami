"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CookedRecipeCard, type CookedRecipeData } from "@/components/recipe-card-shell";

export function ProfileClient({
  initialName,
  email,
  cooked,
}: {
  initialName: string;
  email: string;
  cooked: CookedRecipeData[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong saving your name.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Profile</h1>

      <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5">
        <label className="block text-sm font-medium text-[#1A1D1B]">Name</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setSaved(false);
              setName(e.target.value);
            }}
            className="w-full max-w-xs rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45]"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="shrink-0 rounded-xl bg-[#1F5F45] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2E7D5B] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && <span className="text-sm text-[#1F5F45]">Saved!</span>}
        </div>
        {error && <p className="mt-2 text-sm text-[#B23A32]">{error}</p>}

        <p className="mt-4 text-sm text-[#6B7370]">{email}</p>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[#1A1D1B]">Cook book</h2>
        <p className="mt-1 text-sm text-[#6B7370]">
          Recipes you've marked as cooked show up here.
        </p>

        {cooked.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7370]">
            Nothing cooked yet. Mark a recipe as cooked from your dashboard to add it here.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cooked.map((recipe) => (
              <CookedRecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
