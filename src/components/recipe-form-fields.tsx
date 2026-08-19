"use client";

import { useState } from "react";
import {
  DIFFICULTIES,
  MEAL_SLOTS,
  type EditorAllergen,
  type EditorAttributeTag,
  type EditorCuisine,
  type EditorDiet,
  type EditorIngredient,
  type EditorRecipe,
  type EditorStep,
  type EditorSubRecipe,
  type RecipeFormValues,
} from "@/lib/recipe-form-shared";

export function inputClass() {
  return "w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]";
}

export function labelClass() {
  return "mb-1 block text-xs font-medium text-[#6B7370]";
}

/**
 * Standalone "add a new cuisine" affordance — admin-only (hits the
 * admin-only POST /api/admin/cuisines endpoint). Manages its own local
 * name/adding/error state; calls `onCreated` with the new cuisine so the
 * caller can refresh/select it. Used by the admin cuisine dropdown list
 * (outside the recipe editor modal).
 */
export function AddCuisineInline({ onCreated }: { onCreated: (cuisine: EditorCuisine) => void }) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cuisines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to add cuisine");
      const { cuisine } = (await res.json()) as { cuisine: EditorCuisine };
      onCreated(cuisine);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add cuisine");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#E8E6E0] bg-white p-4">
      <label className={labelClass()}>Add a new cuisine</label>
      <div className="flex gap-2">
        <input
          className={inputClass()}
          placeholder="e.g. Ethiopian"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={adding || !name.trim()}
          className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50"
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Chip({
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
          ? "border-[#1B4332] bg-[#EDF3EF] text-[#1B4332]"
          : "border-[#E8E6E0] text-[#6B7370]"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Purely presentational recipe form fields — title/description/servings/
 * difficulty/cuisine-picker/meal-slot chips/attribute chips/diet chips/
 * allergen chips/batch-friendly/ingredients/steps. No fetch calls inside;
 * driven entirely by props so it can be reused by both the admin
 * create/edit modal and the public submission form.
 */
export function RecipeFormFields({
  form,
  update,
  toggleArrayValue,
  cuisines,
  diets,
  allergens,
  attributeTags,
  newCuisineName,
  setNewCuisineName,
  addingCuisine,
  onAddCuisine,
  allowAddCuisine = true,
  updateIngredient,
  addIngredient,
  removeIngredient,
  updateStep,
  addStep,
  removeStep,
  updateSubRecipe,
  addSubRecipe,
  removeSubRecipe,
  updateSubRecipeIngredient,
  addSubRecipeIngredient,
  removeSubRecipeIngredient,
  updateSubRecipeStep,
  addSubRecipeStep,
  removeSubRecipeStep,
}: {
  form: RecipeFormValues;
  update: <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => void;
  toggleArrayValue: (key: "attributes" | "dietIds" | "allergenIds", value: string) => void;
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
  attributeTags: EditorAttributeTag[];
  newCuisineName: string;
  setNewCuisineName: (value: string) => void;
  addingCuisine: boolean;
  onAddCuisine: () => void;
  // Creating a new cuisine hits an admin-only endpoint — hidden for the
  // public submission form, shown for the admin editor/list.
  allowAddCuisine?: boolean;
  updateIngredient: (i: number, patch: Partial<EditorIngredient>) => void;
  addIngredient: () => void;
  removeIngredient: (i: number) => void;
  updateStep: (i: number, patch: Partial<EditorStep>) => void;
  addStep: () => void;
  removeStep: (i: number) => void;
  // Sub-recipe editing is admin-only (curation decision, not exposed on the
  // public submission form) — omit all of these props to hide the block.
  updateSubRecipe?: (i: number, patch: Partial<EditorSubRecipe>) => void;
  addSubRecipe?: () => void;
  removeSubRecipe?: (i: number) => void;
  updateSubRecipeIngredient?: (
    subIdx: number,
    ingIdx: number,
    patch: Partial<EditorSubRecipe["ingredients"][number]>,
  ) => void;
  addSubRecipeIngredient?: (subIdx: number) => void;
  removeSubRecipeIngredient?: (subIdx: number, ingIdx: number) => void;
  updateSubRecipeStep?: (subIdx: number, stepIdx: number, text: string) => void;
  addSubRecipeStep?: (subIdx: number) => void;
  removeSubRecipeStep?: (subIdx: number, stepIdx: number) => void;
}) {
  return (
    <>
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
        {allowAddCuisine && (
          <div className="mt-2 flex gap-2">
            <input
              className={inputClass()}
              placeholder="Add new cuisine…"
              value={newCuisineName}
              onChange={(e) => setNewCuisineName(e.target.value)}
            />
            <button
              type="button"
              onClick={onAddCuisine}
              disabled={addingCuisine || !newCuisineName.trim()}
              className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50"
            >
              {addingCuisine ? "Adding…" : "+ Add"}
            </button>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass()}>Meal slot</label>
        <div className="flex flex-wrap gap-2">
          {MEAL_SLOTS.map((slot) => (
            <Chip
              key={slot}
              active={form.mealSlot === slot}
              onClick={() => update("mealSlot", slot)}
            >
              {slot}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass()}>Attributes / tags</label>
        <div className="flex flex-wrap gap-2">
          {attributeTags.map((t) => (
            <Chip
              key={t.id}
              active={form.attributes.includes(t.code)}
              onClick={() => toggleArrayValue("attributes", t.code)}
            >
              {t.name}
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

      {/* Macros — all optional, kept to 4 simple numbers per serving. */}
      <div>
        <label className={labelClass()}>Macros (per serving, optional)</label>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <input
              type="number"
              min={0}
              className={inputClass()}
              placeholder="Cal"
              value={form.caloriesPerServing ?? ""}
              onChange={(e) =>
                update("caloriesPerServing", e.target.value ? Number(e.target.value) : null)
              }
            />
            <p className="mt-1 text-center text-[10px] text-[#6B7370]">calories</p>
          </div>
          <div>
            <input
              type="number"
              min={0}
              className={inputClass()}
              placeholder="g"
              value={form.proteinGrams ?? ""}
              onChange={(e) => update("proteinGrams", e.target.value ? Number(e.target.value) : null)}
            />
            <p className="mt-1 text-center text-[10px] text-[#6B7370]">protein</p>
          </div>
          <div>
            <input
              type="number"
              min={0}
              className={inputClass()}
              placeholder="g"
              value={form.carbsGrams ?? ""}
              onChange={(e) => update("carbsGrams", e.target.value ? Number(e.target.value) : null)}
            />
            <p className="mt-1 text-center text-[10px] text-[#6B7370]">carbs</p>
          </div>
          <div>
            <input
              type="number"
              min={0}
              className={inputClass()}
              placeholder="g"
              value={form.fatGrams ?? ""}
              onChange={(e) => update("fatGrams", e.target.value ? Number(e.target.value) : null)}
            />
            <p className="mt-1 text-center text-[10px] text-[#6B7370]">fat</p>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass()}>Pairing suggestion (optional)</label>
        <input
          className={inputClass()}
          placeholder="e.g. Pairs well with a cold beer or caipirinha."
          value={form.pairingSuggestion ?? ""}
          onChange={(e) => update("pairingSuggestion", e.target.value || null)}
        />
      </div>

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

      {/* Sub-recipes — optional "make it yourself" add-ons, e.g. dough.
          Admin-only; hidden on the public submission form. */}
      {addSubRecipe && (
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass()}>Sub-recipes (optional)</label>
          <button
            type="button"
            onClick={addSubRecipe}
            className="text-xs font-medium text-[#2C5A87] underline"
          >
            + Add sub-recipe
          </button>
        </div>
        <div className="space-y-3">
          {form.subRecipes.map((sub, subIdx) => (
            <div key={subIdx} className="rounded-lg border border-[#E8E6E0] bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  className={inputClass()}
                  placeholder='Title, e.g. "Make your own empanada dough"'
                  value={sub.title}
                  onChange={(e) => updateSubRecipe?.(subIdx, { title: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeSubRecipe?.(subIdx)}
                  className="shrink-0 text-xs text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#6B7370]">Ingredients</p>
                  <button
                    type="button"
                    onClick={() => addSubRecipeIngredient?.(subIdx)}
                    className="text-xs font-medium text-[#2C5A87] underline"
                  >
                    + Add ingredient
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {sub.ingredients.map((ing, ingIdx) => (
                    <div key={ingIdx} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
                      <input
                        className={inputClass()}
                        placeholder="Qty"
                        value={ing.quantity}
                        onChange={(e) =>
                          updateSubRecipeIngredient?.(subIdx, ingIdx, { quantity: e.target.value })
                        }
                      />
                      <input
                        className={inputClass()}
                        placeholder="Unit"
                        value={ing.unit ?? ""}
                        onChange={(e) =>
                          updateSubRecipeIngredient?.(subIdx, ingIdx, { unit: e.target.value || null })
                        }
                      />
                      <input
                        className={inputClass()}
                        placeholder="Item"
                        value={ing.item}
                        onChange={(e) =>
                          updateSubRecipeIngredient?.(subIdx, ingIdx, { item: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeSubRecipeIngredient?.(subIdx, ingIdx)}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#6B7370]">Steps</p>
                  <button
                    type="button"
                    onClick={() => addSubRecipeStep?.(subIdx)}
                    className="text-xs font-medium text-[#2C5A87] underline"
                  >
                    + Add step
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {sub.steps.map((text, stepIdx) => (
                    <div key={stepIdx} className="flex items-center gap-2">
                      <textarea
                        rows={2}
                        className={inputClass()}
                        placeholder={`Step ${stepIdx + 1}`}
                        value={text}
                        onChange={(e) => updateSubRecipeStep?.(subIdx, stepIdx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSubRecipeStep?.(subIdx, stepIdx)}
                        className="shrink-0 text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
