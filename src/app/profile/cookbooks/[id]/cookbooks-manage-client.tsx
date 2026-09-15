"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserCookbookRecipeCard,
  type SavedRecipeData,
} from "@/components/recipe-card-shell";
import { compressImage } from "@/lib/image-compression";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";
import { LoadingOrb } from "@/components/loading-orb";

export function CookbookManageClient({
  cookbookId,
  initialName,
  initialCoverImageUrl,
  recipes,
  availableToAdd,
}: {
  cookbookId: string;
  initialName: string;
  initialCoverImageUrl: string | null;
  recipes: SavedRecipeData[];
  availableToAdd: SavedRecipeData[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialCoverImageUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setCoverPreview(previewUrl);

      const formData = new FormData();
      formData.append("file", compressed, "cover.webp");
      const res = await fetch(`/api/cookbooks/${cookbookId}/cover`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong uploading the cover.");
        return;
      }
      setCoverPreview(data.coverImageUrl ?? previewUrl);
      router.refresh();
    } catch {
      setError("Something went wrong uploading the cover.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Cookbook name can't be empty.");
      return;
    }
    setSavingName(true);
    setNameSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/cookbooks/${cookbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong renaming your cookbook.");
        return;
      }
      setNameSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function addRecipe(recipeId: string) {
    setAddingRecipeId(recipeId);
    setError(null);
    try {
      const res = await fetch(`/api/cookbooks/${cookbookId}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong adding that recipe.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setAddingRecipeId(null);
    }
  }

  async function removeRecipe(recipeId: string) {
    setRemovingRecipeId(recipeId);
    setError(null);
    try {
      const res = await fetch(`/api/cookbooks/${cookbookId}/recipes/${recipeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong removing that recipe.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setRemovingRecipeId(null);
    }
  }

  async function deleteCookbook() {
    if (!confirm(`Delete "${initialName}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cookbooks/${cookbookId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong deleting your cookbook.");
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <PageTransition>
        <h1 className="text-2xl font-bold text-[#101010]">Manage cookbook</h1>
        <p className="mt-1 text-sm text-[#6B7370]">
          Public — visible to other signed-in users on your profile.
        </p>

        <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <MotionButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCover}
              whileHover={{ y: -2 }}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8E6E0] bg-[#EDF3EF] text-xs text-[#6B7370] disabled:opacity-50"
              aria-label="Change cookbook cover"
            >
              <AnimatePresence mode="wait" initial={false}>
                {coverPreview ? (
                  <motion.img
                    key={coverPreview}
                    src={coverPreview}
                    alt=""
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : (
                  <motion.span
                    key="no-cover"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Add cover
                  </motion.span>
                )}
              </AnimatePresence>
            </MotionButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
            <div>
              <p className="text-sm font-medium text-[#101010]">Cover picture</p>
              <p className="flex items-center gap-2 text-xs text-[#6B7370]">
                {uploadingCover ? (
                  <>
                    <LoadingOrb size={20} /> Uploading...
                  </>
                ) : (
                  "Click to change."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-[#101010]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setNameSaved(false);
                setName(e.target.value);
              }}
              className="mt-2 w-full max-w-sm rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <MotionButton
              type="button"
              onClick={saveName}
              disabled={savingName}
              className="shrink-0 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white shadow-brand transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
            >
              {savingName ? "Saving..." : "Save name"}
            </MotionButton>
            {nameSaved && <span className="text-sm text-[#1B4332]">Saved!</span>}
          </div>

          {error && <p className="mt-3 text-sm text-[#B23A32]">{error}</p>}
        </div>

        {availableToAdd.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-[#101010]">Add a recipe you&apos;ve cooked</h2>
            <div className="mt-3 space-y-2">
              {availableToAdd.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-xl border border-[#E8E6E0] bg-white px-4 py-3"
                >
                  <span className="text-sm text-[#101010]">{recipe.title}</span>
                  <MotionButton
                    type="button"
                    onClick={() => addRecipe(recipe.id)}
                    disabled={addingRecipeId === recipe.id}
                    className="shrink-0 rounded-lg border border-[#E8E6E0] px-3 py-1.5 text-xs font-medium text-[#101010] shadow-brand disabled:opacity-50"
                  >
                    {addingRecipeId === recipe.id ? "Adding..." : "Add"}
                  </MotionButton>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[#101010]">Recipes</h2>
          {recipes.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B7370]">
              No recipes yet. Add one from your cooked recipes above.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {recipes.map((recipe) => (
                <UserCookbookRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onRemove={() => removeRecipe(recipe.id)}
                  removing={removingRecipeId === recipe.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-[#E8E6E0] pt-6">
          <MotionButton
            type="button"
            onClick={deleteCookbook}
            disabled={deleting}
            className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#B23A32] shadow-brand transition-colors hover:bg-[#EDF3EF] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete cookbook"}
          </MotionButton>
        </div>
      </PageTransition>
    </main>
  );
}
