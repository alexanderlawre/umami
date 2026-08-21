"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/recipe-form-fields";
import { LoadingOrb } from "@/components/loading-orb";

type WithCount = { id: string; name: string; _count: Record<string, number> };

type FoodGroupRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  _count: { foodGroupPreferences: number; recipeProfiles: number };
};

const FOOD_GROUP_CATEGORIES = ["PRODUCE", "PROTEIN", "GRAIN", "DAIRY", "FLAVOR", "OTHER"] as const;

function usageCount(row: WithCount): number {
  return Object.values(row._count).reduce((sum, n) => sum + n, 0);
}

function usageLabel(row: WithCount): string {
  return Object.entries(row._count)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${n} ${key}`)
    .join(", ");
}

// One reusable list+add UI for the three name-only catalogs (Diet, Allergen,
// Cuisine) — mirrors the existing AddCuisineInline pattern generalized to a
// configurable endpoint.
function CatalogSection({
  title,
  description,
  endpoint,
  items,
  confirmOnUse = true,
}: {
  title: string;
  description: string;
  endpoint: string;
  items: WithCount[];
  // When true (the default), removing a row that's still in use asks for
  // confirmation before deleting, since the server will cascade-detach it
  // from everything referencing it rather than blocking. Set to false for
  // catalogs (Cuisines) whose DELETE route still blocks server-side, where a
  // client confirm wouldn't do anything useful.
  confirmOnUse?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (confirmOnUse && row && usageCount(row) > 0) {
      const ok = window.confirm(
        `"${row.name}" is still referenced by ${usageLabel(row)}. Removing it will delete those references too. Continue?`,
      );
      if (!ok) return;
    }

    setDeletingId(id);
    setDeleteError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError((prev) => ({ ...prev, [id]: body.error ?? "Failed to remove" }));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: "Failed to remove" }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#1A1D1B]">{title}</h2>
      <p className="mt-0.5 text-xs text-[#6B7370]">{description}</p>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const inUse = usageCount(row) > 0;
          return (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E6E0] px-3 py-2"
            >
              <div>
                <span className="text-sm text-[#1A1D1B]">{row.name}</span>
                {inUse && (
                  <span className="ml-2 text-xs text-[#6B7370]">({usageLabel(row)})</span>
                )}
                {deleteError[row.id] && (
                  <p className="mt-1 text-xs text-red-600">{deleteError[row.id]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(row.id)}
                disabled={deletingId === row.id}
                title={
                  inUse
                    ? confirmOnUse
                      ? "Still in use. Removing will also detach it from those references."
                      : "Still in use. Remove references first."
                    : "Remove"
                }
                className="shrink-0 rounded-lg border border-[#E8E6E0] px-2 py-1 text-xs text-[#6B7370] hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === row.id ? (
                  <span className="inline-flex items-center gap-1.5">
                    <LoadingOrb size={20} /> Removing…
                  </span>
                ) : (
                  "Remove"
                )}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-sm text-[#6B7370]">None yet.</li>}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          className={inputClass()}
          placeholder="Add a new option"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={adding || !name.trim()}
          className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50"
        >
          {adding ? (
            <span className="inline-flex items-center gap-1.5">
              <LoadingOrb size={20} /> Adding…
            </span>
          ) : (
            "+ Add"
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}

function FoodGroupSection({ items }: { items: FoodGroupRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof FOOD_GROUP_CATEGORIES)[number]>("OTHER");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const [rows, setRows] = useState(items);

  async function submit() {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName || !trimmedDesc) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/food-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, category, description: trimmedDesc }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setName("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) {
      const inUse = row._count.foodGroupPreferences + row._count.recipeProfiles > 0;
      if (inUse) {
        const ok = window.confirm(
          `"${row.name}" is still referenced by ${row._count.foodGroupPreferences} user preference(s) and ${row._count.recipeProfiles} recipe profile(s). Removing it will delete those references too. Continue?`,
        );
        if (!ok) return;
      }
    }

    setDeletingId(id);
    setDeleteError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/food-groups/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError((prev) => ({ ...prev, [id]: body.error ?? "Failed to remove" }));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: "Failed to remove" }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#1A1D1B]">Food groups</h2>
      <p className="mt-0.5 text-xs text-[#6B7370]">
        Used for recipe profiling and the onboarding/settings taste sliders. Note: the sliders
        cluster food groups into ~12 broad categories defined in code — a newly added group is
        usable for recipe tagging right away, but won&apos;t appear in a slider until it&apos;s
        wired into a cluster.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const inUse = row._count.foodGroupPreferences + row._count.recipeProfiles > 0;
          return (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E6E0] px-3 py-2"
            >
              <div>
                <span className="text-sm text-[#1A1D1B]">{row.name}</span>
                <span className="ml-2 rounded-full bg-[#F4F2EC] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#6B7370]">
                  {row.category}
                </span>
                <p className="mt-0.5 text-xs text-[#6B7370]">{row.description}</p>
                {deleteError[row.id] && (
                  <p className="mt-1 text-xs text-red-600">{deleteError[row.id]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(row.id)}
                disabled={deletingId === row.id}
                title={inUse ? "Still in use. Removing will also detach it from those references." : "Remove"}
                className="shrink-0 rounded-lg border border-[#E8E6E0] px-2 py-1 text-xs text-[#6B7370] hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === row.id ? (
                  <span className="inline-flex items-center gap-1.5">
                    <LoadingOrb size={20} /> Removing…
                  </span>
                ) : (
                  "Remove"
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass()}
          placeholder="Food group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className={inputClass()}
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof FOOD_GROUP_CATEGORIES)[number])}
        >
          {FOOD_GROUP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          className={`${inputClass()} sm:col-span-2`}
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <button
          type="button"
          onClick={submit}
          disabled={adding || !name.trim() || !description.trim()}
          className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          {adding ? (
            <span className="inline-flex items-center gap-1.5">
              <LoadingOrb size={20} /> Adding…
            </span>
          ) : (
            "+ Add food group"
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}

export function PreferencesClient({
  diets,
  allergens,
  cuisines,
  foodGroups,
  attributeTags,
}: {
  diets: WithCount[];
  allergens: WithCount[];
  cuisines: WithCount[];
  foodGroups: FoodGroupRow[];
  attributeTags: WithCount[];
}) {
  return (
    <div className="space-y-6">
      <CatalogSection
        title="Diets"
        description="Shown as options in onboarding's Preferences step and in Settings."
        endpoint="/api/admin/diets"
        items={diets}
      />
      <CatalogSection
        title="Allergens"
        description="Shown as options in onboarding's Preferences step and in Settings. This is the hard safety filter for the dashboard feed."
        endpoint="/api/admin/allergens"
        items={allergens}
      />
      <CatalogSection
        title="Cuisines"
        description="Used for recipe tagging, favorite-cuisine matching, and the admin Recipes tab. Every recipe requires a cuisine, so one that's still in use can't be removed. Reassign those recipes first."
        endpoint="/api/admin/cuisines"
        items={cuisines}
        confirmOnUse={false}
      />
      <CatalogSection
        title="Attribute tags"
        description="Shown as chips on recipe cards and as filter options (e.g. High protein, Grilled, Spicy). Used in the recipe editor to tag recipes."
        endpoint="/api/admin/attribute-tags"
        items={attributeTags}
      />
      <FoodGroupSection items={foodGroups} />
    </div>
  );
}
