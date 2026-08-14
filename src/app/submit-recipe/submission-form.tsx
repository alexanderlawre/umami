"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeFormFields } from "@/components/recipe-form-fields";
import {
  EMPTY_RECIPE,
  type EditorAllergen,
  type EditorCuisine,
  type EditorDiet,
  type EditorIngredient,
  type EditorStep,
  type RecipeFormValues,
} from "@/lib/recipe-form-shared";

export function SubmissionForm({
  cuisines,
  diets,
  allergens,
}: {
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeFormValues>(EMPTY_RECIPE);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.cuisineId) {
      setError("Pick a cuisine.");
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
      const res = await fetch("/api/recipes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Submission failed");
      }
      const { submission } = (await res.json()) as { submission: { id: string } };

      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const photoRes = await fetch(`/api/recipes/submit/${submission.id}/image`, {
          method: "POST",
          body: formData,
        });
        if (!photoRes.ok) {
          // Submission itself succeeded — surface a soft warning but still treat as submitted.
          setError("Recipe submitted, but the photo upload failed. You can resubmit with a photo next time.");
        }
      }

      setSubmitted(true);
      setForm(EMPTY_RECIPE);
      setPhotoFile(null);
      setPhotoPreview(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[#E8E6E0] bg-white p-6 text-center">
        <p className="text-sm font-medium text-[#1A1D1B]">Thanks! Your recipe was submitted.</p>
        <p className="mt-1 text-sm text-[#6B7370]">
          An admin will review it soon. You can track its status above.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 rounded-xl border border-[#E8E6E0] px-4 py-2 text-sm font-medium text-[#1A1D1B]"
        >
          Submit another recipe
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#E8E6E0] bg-white p-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#6B7370]">Photo (optional)</label>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#EDF3EF]">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
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
            {photoFile ? "Change photo" : "Add photo"}
          </button>
        </div>
      </div>

      <RecipeFormFields
        form={form}
        update={update}
        toggleArrayValue={toggleArrayValue}
        cuisines={cuisines}
        diets={diets}
        allergens={allergens}
        attributeTags={[]}
        newCuisineName=""
        setNewCuisineName={() => {}}
        addingCuisine={false}
        onAddCuisine={() => {}}
        allowAddCuisine={false}
        updateIngredient={updateIngredient}
        addIngredient={addIngredient}
        removeIngredient={removeIngredient}
        updateStep={updateStep}
        addStep={addStep}
        removeStep={removeStep}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border-t border-[#E8E6E0] pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit recipe"}
        </button>
      </div>
    </div>
  );
}
