"use client";

import { useRef, useState } from "react";
import { RecipeFormFields, labelClass } from "@/components/recipe-form-fields";
import { compressImage } from "@/lib/image-compression";
import {
  EMPTY_RECIPE,
  type EditorAllergen,
  type EditorAttributeTag,
  type EditorCuisine,
  type EditorDiet,
  type EditorIngredient,
  type EditorRecipe,
  type EditorStep,
  type RecipeFormValues,
} from "@/lib/recipe-form-shared";

export type { EditorAllergen, EditorAttributeTag, EditorCuisine, EditorDiet, EditorRecipe };

export function RecipeEditor({
  recipe,
  cuisines: initialCuisines,
  diets,
  allergens,
  attributeTags,
  onClose,
  onSaved,
}: {
  recipe: EditorRecipe | null; // null = create mode
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
  attributeTags: EditorAttributeTag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = recipe === null;
  const [cuisines, setCuisines] = useState(initialCuisines);
  const [form, setForm] = useState<RecipeFormValues>(
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
          caloriesPerServing: recipe.caloriesPerServing,
          proteinGrams: recipe.proteinGrams,
          carbsGrams: recipe.carbsGrams,
          fatGrams: recipe.fatGrams,
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

  function update<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleArrayValue(key: "attributes" | "dietIds" | "allergenIds", value: string) {
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
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed, "photo.webp");
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
                  accept="image/*"
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
              <p className="mt-1 text-xs text-[#6B7370]">
                Any image format or size works. It&apos;s automatically resized and cropped for display.
              </p>
              {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
            </div>
          )}
          {isCreate && (
            <p className="text-xs text-[#6B7370]">
              You can add a photo after creating the recipe.
            </p>
          )}

          <RecipeFormFields
            form={form}
            update={update}
            toggleArrayValue={toggleArrayValue}
            cuisines={cuisines}
            diets={diets}
            allergens={allergens}
            attributeTags={attributeTags}
            newCuisineName={newCuisineName}
            setNewCuisineName={setNewCuisineName}
            addingCuisine={addingCuisine}
            onAddCuisine={addCuisine}
            updateIngredient={updateIngredient}
            addIngredient={addIngredient}
            removeIngredient={removeIngredient}
            updateStep={updateStep}
            addStep={addStep}
            removeStep={removeStep}
          />

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
              className="flex-1 rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : isCreate ? "Create recipe" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
