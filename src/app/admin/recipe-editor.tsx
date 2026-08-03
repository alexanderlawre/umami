"use client";

import { useRef, useState } from "react";
import { ATTRIBUTE_LABELS } from "@/lib/recipe-tags";

export type EditorCuisine = { id: string; name: string; slug: string };
export type EditorDiet = { id: string; name: string };
export type EditorAllergen = { id: string; name: string };

type EditorIngredient = {
  component: string | null;
  quantity: string;
  unit: string | null;
  item: string;
  prepNote: string | null;
  optional: boolean;
};

type EditorStep = {
  text: string;
  durationMinutes: number | null;
};

export type EditorRecipe = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  introCopy: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "INVOLVED";
  cuisineId: string;
  mealSlot: string[];
  effortTier: "WEEKNIGHT" | "WEEKEND" | "PROJECT";
  batchFriendly: boolean;
  attributes: string[];
  heroColor: string;
  imageUrl: string | null;
  imageCredit: string | null;
  isActive: boolean;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  dietIds: string[];
  allergenIds: string[];
  ingredients: EditorIngredient[];
  steps: EditorStep[];
};

const EMPTY_RECIPE: Omit<EditorRecipe, "id" | "slug" | "imageUrl" | "isActive" | "allergenReviewStatus"> = {
  title: "",
  shortDescription: "",
  note: "",
  introCopy: "",
  servings: 4,
  prepMinutes: 15,
  cookMinutes: 20,
  difficulty: "EASY",
  cuisineId: "",
  mealSlot: ["DINNER"],
  effortTier: "WEEKNIGHT",
  batchFriendly: false,
  attributes: [],
  heroColor: "#1F5F45",
  imageCredit: null,
  dietIds: [],
  allergenIds: [],
  ingredients: [{ component: null, quantity: "", unit: null, item: "", prepNote: null, optional: false }],
  steps: [{ text: "", durationMinutes: null }],
};

const DIFFICULTIES = ["EASY", "MEDIUM", "INVOLVED"] as const;
const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
const EFFORT_TIERS = ["WEEKNIGHT", "WEEKEND", "PROJECT"] as const;

function inputClass() {
  return "w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F45]";
}

function labelClass() {
  return "mb-1 block text-xs font-medium text-[#6B7370]";
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
          : "border-[#E8E6E0] text-[#6B7370]"
      }`}
    >
      {children}
    </button>
  );
}

export function RecipeEditor({
  recipe,
  cuisines: initialCuisines,
  diets,
  allergens,
  onClose,
  onSaved,
}: {
  recipe: EditorRecipe | null; // null = create mode
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = recipe === null;
  const [cuisines, setCuisines] = useState(initialCuisines);
  const [form, setForm] = useState<Omit<EditorRecipe, "id" | "slug" | "imageUrl" | "isActive" | "allergenReviewStatus">>(
    recipe
      ? {
          title: recipe.title,
          shortDescription: recipe.shortDescription,
          note: recipe.note,
          introCopy: recipe.introCopy,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          difficulty: recipe.difficulty,
          cuisineId: recipe.cuisineId,
          mealSlot: recipe.mealSlot,
          effortTier: recipe.effortTier,
          batchFriendly: recipe.batchFriendly,
          attributes: recipe.attributes,
          heroColor: recipe.heroColor,
          imageCredit: recipe.imageCredit,
          dietIds: recipe.dietIds,
          allergenIds: recipe.allergenIds,
          ingredients: recipe.ingredients.length
            ? recipe.ingredients
            : EMPTY_RECIPE.ingredients,
          steps: recipe.steps.length ? recipe.steps : EMPTY_RECIPE.steps,
        }
      : EMPTY_RECIPE,
  );
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl ?? null);
  const [newCuisineName, setNewCuisineName] = useState("");
  const [addingCuisine, setAddingCuisine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleArrayValue(key: "mealSlot" | "attributes" | "dietIds" | "allergenIds", value: string) {
    setForm((f) => {
      const list = f[key] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next };
    });
  }

  async function addCuisine() {
    const name = newCuisineName.trim();
    if (!name) return;
    setAddingCuisine(true);
    try {
      const res = await fetch("/api/admin/cuisines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const { cuisine } = (await res.json()) as { cuisine: EditorCuisine };
      setCuisines((prev) =>
        prev.some((c) => c.id === cuisine.id) ? prev : [...prev, cuisine].sort((a, b) => a.name.localeCompare(b.name)),
      );
      update("cuisineId", cuisine.id);
      setNewCuisineName("");
    } finally {
      setAddingCuisine(false);
    }
  }

  function updateIngredient(i: number, patch: Partial<EditorIngredient>) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)),
    }));
  }

  function addIngredient() {
    setForm((f) => ({
      ...f,
      ingredients: [
        ...f.ingredients,
        { component: null, quantity: "", unit: null, item: "", prepNote: null, optional: false },
      ],
    }));
  }

  function removeIngredient(i: number) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  }

  function updateStep(i: number, patch: Partial<EditorStep>) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { text: "", durationMinutes: null }] }));
  }

  function removeStep(i: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !recipe) return;
    setPhotoError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/recipes/${recipe.id}/image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload failed");
      }
      const { imageUrl: newUrl } = (await res.json()) as { imageUrl: string };
      setImageUrl(`${newUrl}?v=${Date.now()}`);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!form.cuisineId) {
      setError("Pick a cuisine, or add a new one.");
      return;
    }
    if (form.ingredients.some((i) => !i.item.trim())) {
      setError("Every ingredient needs an item name.");
      return;
    }
    if (form.steps.some((s) => !s.text.trim())) {
      setError("Every step needs text.");
      return;
    }

    setSaving(true);
    try {
      const url = isCreate ? "/api/admin/recipes" : `/api/admin/recipes/${recipe!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Save failed");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-[#FBFAF7] p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1D1B]">
            {isCreate ? "New recipe" : `Edit ${recipe!.title}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E8E6E0] px-3 py-1 text-xs text-[#6B7370]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Photo */}
          {!isCreate && (
            <div>
              <label className={labelClass()}>Photo</label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#EDF3EF]">
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="rounded-full border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50"
                >
                  Change photo
                </button>
              </div>
              {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
            </div>
          )}
          {isCreate && (
            <p className="text-xs text-[#6B7370]">
              You can add a photo after creating the recipe.
            </p>
          )}

          <div>
            <label className={labelClass()}>Title</label>
            <input
              className={inputClass()}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass()}>Short description</label>
            <input
              className={inputClass()}
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass()}>Note</label>
            <textarea
              rows={2}
              className={inputClass()}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass()}>Intro copy</label>
            <textarea
              rows={3}
              className={inputClass()}
              value={form.introCopy}
              onChange={(e) => update("introCopy", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass()}>Servings</label>
              <input
                type="number"
                min={1}
                className={inputClass()}
                value={form.servings}
                onChange={(e) => update("servings", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass()}>Prep min</label>
              <input
                type="number"
                min={0}
                className={inputClass()}
                value={form.prepMinutes}
                onChange={(e) => update("prepMinutes", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass()}>Cook min</label>
              <input
                type="number"
                min={0}
                className={inputClass()}
                value={form.cookMinutes}
                onChange={(e) => update("cookMinutes", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass()}>Difficulty</label>
              <select
                className={inputClass()}
                value={form.difficulty}
                onChange={(e) => update("difficulty", e.target.value as EditorRecipe["difficulty"])}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass()}>Effort tier</label>
              <select
                className={inputClass()}
                value={form.effortTier}
                onChange={(e) => update("effortTier", e.target.value as EditorRecipe["effortTier"])}
              >
                {EFFORT_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass()}>Cuisine</label>
            <div className="flex gap-2">
              <select
                className={inputClass()}
                value={form.cuisineId}
                onChange={(e) => update("cuisineId", e.target.value)}
              >
                <option value="">Select a cuisine…</option>
                {cuisines.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={inputClass()}
                placeholder="Add new cuisine…"
                value={newCuisineName}
                onChange={(e) => setNewCuisineName(e.target.value)}
              />
              <button
                type="button"
                onClick={addCuisine}
                disabled={addingCuisine || !newCuisineName.trim()}
                className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50"
              >
                {addingCuisine ? "Adding…" : "+ Add"}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass()}>Meal slot</label>
            <div className="flex flex-wrap gap-2">
              {MEAL_SLOTS.map((slot) => (
                <Chip
                  key={slot}
                  active={form.mealSlot.includes(slot)}
                  onClick={() => toggleArrayValue("mealSlot", slot)}
                >
                  {slot}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass()}>Attributes / tags</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ATTRIBUTE_LABELS).map(([code, label]) => (
                <Chip
                  key={code}
                  active={form.attributes.includes(code)}
                  onClick={() => toggleArrayValue("attributes", code)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass()}>Diet tags</label>
            <div className="flex flex-wrap gap-2">
              {diets.map((d) => (
                <Chip
                  key={d.id}
                  active={form.dietIds.includes(d.id)}
                  onClick={() => toggleArrayValue("dietIds", d.id)}
                >
                  {d.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass()}>Allergen tags</label>
            <div className="flex flex-wrap gap-2">
              {allergens.map((a) => (
                <Chip
                  key={a.id}
                  active={form.allergenIds.includes(a.id)}
                  onClick={() => toggleArrayValue("allergenIds", a.id)}
                >
                  {a.name}
                </Chip>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1A1D1B]">
            <input
              type="checkbox"
              checked={form.batchFriendly}
              onChange={(e) => update("batchFriendly", e.target.checked)}
            />
            Batch friendly
          </label>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass()}>Ingredients</label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-xs font-medium text-[#2C5A87] underline"
              >
                + Add ingredient
              </button>
            </div>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="rounded-lg border border-[#E8E6E0] bg-white p-2">
                  <div className="grid grid-cols-[1fr_1fr_2fr] gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(i, { quantity: e.target.value })}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Unit"
                      value={ing.unit ?? ""}
                      onChange={(e) => updateIngredient(i, { unit: e.target.value || null })}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Item"
                      value={ing.item}
                      onChange={(e) => updateIngredient(i, { item: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-[2fr_1fr_auto_auto] items-center gap-2">
                    <input
                      className={inputClass()}
                      placeholder="Prep note (optional)"
                      value={ing.prepNote ?? ""}
                      onChange={(e) => updateIngredient(i, { prepNote: e.target.value || null })}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Component (optional)"
                      value={ing.component ?? ""}
                      onChange={(e) => updateIngredient(i, { component: e.target.value || null })}
                    />
                    <label className="flex items-center gap-1 whitespace-nowrap text-xs text-[#6B7370]">
                      <input
                        type="checkbox"
                        checked={ing.optional}
                        onChange={(e) => updateIngredient(i, { optional: e.target.checked })}
                      />
                      Optional
                    </label>
                    <button
                      type="button"
                      onClick={() => removeIngredient(i)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass()}>Steps</label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs font-medium text-[#2C5A87] underline"
              >
                + Add step
              </button>
            </div>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="rounded-lg border border-[#E8E6E0] bg-white p-2">
                  <textarea
                    rows={2}
                    className={inputClass()}
                    placeholder={`Step ${i + 1}`}
                    value={step.text}
                    onChange={(e) => updateStep(i, { text: e.target.value })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass()} max-w-[8rem]`}
                      placeholder="Duration (min)"
                      value={step.durationMinutes ?? ""}
                      onChange={(e) =>
                        updateStep(i, {
                          durationMinutes: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 border-t border-[#E8E6E0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E8E6E0] py-3 text-sm font-medium text-[#1A1D1B]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#1F5F45] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : isCreate ? "Create recipe" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
