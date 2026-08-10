"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { logInteraction } from "@/lib/log-interaction";
import { attributeLabel, dietEmblemClass } from "@/lib/recipe-tags";
import { MotionButton } from "@/components/motion-button";
import { PageTransition } from "@/components/page-transition";
import { SheetModal } from "@/components/sheet-modal";

type Ingredient = {
  id: string;
  component: string | null;
  order: number;
  quantity: string;
  unit: string | null;
  item: string;
  prepNote: string | null;
  optional: boolean;
};

type Step = {
  id: string;
  order: number;
  text: string;
  durationMinutes: number | null;
};

export type RecipeDetail = {
  id: string;
  title: string;
  shortDescription: string;
  note: string;
  introCopy: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: string;
  cuisine: string;
  effortTier: string;
  ingredients: Ingredient[];
  steps: Step[];
  imageUrl: string | null;
  imageCredit: string | null;
  caloriesPerServing: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  attributes: string[];
  dietTags: string[];
};

function scaleQuantity(quantity: string, factor: number): string {
  const num = Number(quantity);
  if (Number.isNaN(num)) return quantity;
  const scaled = Math.round(num * factor * 100) / 100;
  return String(scaled);
}

export function RecipeDetailClient({
  recipe,
  initialSaved = false,
  isPremium = false,
}: {
  recipe: RecipeDetail;
  initialSaved?: boolean;
  isPremium?: boolean;
}) {
  const [servings, setServings] = useState(recipe.servings);
  const [starred, setStarred] = useState(initialSaved);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cookLogId, setCookLogId] = useState<string | null>(null);
  const [showCosign, setShowCosign] = useState(false);
  const [cosignNote, setCosignNote] = useState("");
  const [cooking, setCooking] = useState(false);
  const [cookError, setCookError] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [justCooked, setJustCooked] = useState(false);

  useEffect(() => {
    // Log OPEN once when the detail page is actually reached, not on link hover/prefetch.
    logInteraction(recipe.id, "OPEN");
  }, [recipe.id]);

  const factor = servings / recipe.servings;

  const hasMacros =
    recipe.caloriesPerServing != null ||
    recipe.proteinGrams != null ||
    recipe.carbsGrams != null ||
    recipe.fatGrams != null;

  const grouped = recipe.ingredients.reduce<Record<string, Ingredient[]>>(
    (acc, ing) => {
      const key = ing.component ?? "__main";
      (acc[key] ??= []).push(ing);
      return acc;
    },
    {},
  );

  async function toggleStar() {
    const next = !starred;
    setStarred(next);
    setSaveError(null);
    logInteraction(recipe.id, next ? "STAR" : "UNSTAR");

    try {
      const res = next
        ? await fetch("/api/saved-recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId: recipe.id }),
          })
        : await fetch(`/api/saved-recipes/${recipe.id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStarred(!next);
        setSaveError(body?.error ?? "Something went wrong.");
      }
    } catch {
      setStarred(!next);
      setSaveError("Something went wrong.");
    }
  }

  async function handleCook() {
    setCooking(true);
    setCookError(null);
    try {
      const res = await fetch("/api/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id, servings }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 429) {
        const nextAvailableAt = data?.nextAvailableAt as string | undefined;
        const when = nextAvailableAt
          ? new Date(nextAvailableAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : "later";
        setCookError(`You can log another cook around ${when}.`);
        return;
      }

      if (!res.ok) {
        setCookError("Something went wrong. Try again.");
        return;
      }

      setCookLogId(data?.cookLogId ?? null);
      setShowCosign(true);
      setJustCooked(true);
      setTimeout(() => setJustCooked(false), 1400);
    } catch {
      setCookError("Something went wrong. Try again.");
    } finally {
      setCooking(false);
    }
  }

  async function submitCosign(share: boolean) {
    if (!cookLogId) {
      setShowCosign(false);
      return;
    }
    await fetch("/api/cook/cosign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookLogId,
        note: share ? cosignNote || undefined : undefined,
        isPublic: share,
      }),
    });
    setShowCosign(false);
    setCosignNote("");
  }

  return (
    <PageTransition className="pb-content-safe">
      {recipe.imageUrl ? (
        <div className="-mx-6 sm:mx-0">
          <motion.div
            className="relative h-56 w-full overflow-hidden sm:rounded-2xl"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(min-width: 640px) 42rem, 100vw"
              className="object-cover"
              priority
            />
          </motion.div>
          {recipe.imageCredit && (
            <p className="mt-1 px-6 text-right text-[10px] text-[#6B7370] sm:px-0">
              Photo: {recipe.imageCredit}
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-4 text-xs uppercase tracking-wide text-[#6B7370]">{recipe.cuisine}</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1D1B]">{recipe.title}</h1>
      <p className="mt-2 text-sm text-[#1A1D1B]">{recipe.introCopy}</p>
      <p className="mt-1 text-xs italic text-[#6B7370]">{recipe.note}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6B7370]">
        <span className="rounded-full bg-[#EDF3EF] px-2 py-1">{recipe.effortTier}</span>
        <span className="rounded-full bg-[#EDF3EF] px-2 py-1">
          {recipe.prepMinutes} min prep / {recipe.cookMinutes} min cook
        </span>
      </div>

      {(recipe.attributes.length > 0 || recipe.dietTags.length > 0) && (
        <div className="mt-3">
          <button
            onClick={() => setTagsOpen((v) => !v)}
            aria-expanded={tagsOpen}
            className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-[#2C5A87]"
          >
            Tags & dietary info
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3.5 w-3.5"
              animate={{ rotate: tagsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>
          <AnimatePresence initial={false}>
            {tagsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {recipe.dietTags
                    .filter((d) => d !== "Omnivore")
                    .map((diet) => (
                      <span
                        key={diet}
                        className={`rounded-full px-2 py-1 font-medium ${dietEmblemClass(diet)}`}
                      >
                        {diet}
                      </span>
                    ))}
                  {recipe.attributes.map((a) => (
                    <span key={a} className="rounded-full bg-[#EDF3EF] px-2 py-1 text-[#6B7370]">
                      {attributeLabel(a)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {hasMacros && (
        <section className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1A1D1B]">Nutrition (per serving)</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-base font-semibold text-[#1A1D1B]">
                {recipe.caloriesPerServing ?? "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[#6B7370]">Calories</p>
            </div>
            {isPremium ? (
              <>
                <div>
                  <p className="text-base font-semibold text-[#1A1D1B]">
                    {recipe.proteinGrams ?? "—"}g
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[#6B7370]">Protein</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-[#1A1D1B]">
                    {recipe.carbsGrams ?? "—"}g
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[#6B7370]">Carbs</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-[#1A1D1B]">
                    {recipe.fatGrams ?? "—"}g
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[#6B7370]">Fat</p>
                </div>
              </>
            ) : (
              <div className="col-span-3 flex items-center justify-center rounded-xl bg-[#EDF3EF] px-2 py-2">
                <p className="text-[11px] text-[#6B7370]">
                  🔒 Unlock full nutrition breakdown with Premium
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1D1B]">Ingredients</h2>
          <div className="flex items-center gap-2">
            <MotionButton
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E6E0] text-base"
              aria-label="Decrease servings"
            >
              −
            </MotionButton>
            <motion.span
              key={servings}
              initial={{ scale: 1.25, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              className="inline-block text-sm text-[#1A1D1B]"
            >
              {servings} servings
            </motion.span>
            <MotionButton
              onClick={() => setServings((s) => s + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E6E0] text-base"
              aria-label="Increase servings"
            >
              +
            </MotionButton>
          </div>
        </div>

        {Object.entries(grouped).map(([component, items]) => (
          <div key={component} className="mt-3">
            {component !== "__main" && (
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7370]">
                {component}
              </p>
            )}
            <ul className="mt-1 space-y-1">
              {[...items]
                .sort((a, b) => a.order - b.order)
                .map((ing) => (
                  <li key={ing.id} className="text-sm text-[#1A1D1B]">
                    {scaleQuantity(ing.quantity, factor)} {ing.unit ?? ""} {ing.item}
                    {ing.optional && <span className="text-[#6B7370]"> (optional)</span>}
                    {ing.prepNote && (
                      <span className="text-[#6B7370]">, {ing.prepNote}</span>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-[#1A1D1B]">Method</h2>
        <ol className="mt-2 space-y-3">
          {[...recipe.steps]
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.id} className="text-sm text-[#1A1D1B]">
                <span className="font-medium">{step.order}.</span> {step.text}
                {step.durationMinutes && (
                  <span className="ml-2 text-xs text-[#6B7370]">
                    ~{step.durationMinutes} min
                  </span>
                )}
              </li>
            ))}
        </ol>
      </section>

      {(saveError || cookError) && (
        <p className="fixed inset-x-0 bottom-20 mx-auto w-fit rounded-lg bg-[#1A1D1B] px-3 py-2 text-xs text-white shadow-sm">
          {saveError || cookError}
        </p>
      )}

      <div className="glass-surface fixed inset-x-0 bottom-0 flex items-center justify-center gap-3 border-x-0 border-b-0 px-4 pt-4 pb-safe-4">
        <MotionButton
          onClick={toggleStar}
          whileTap={{ scale: 0.94 }}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            starred
              ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
              : "border-[#E8E6E0] text-[#1A1D1B]"
          }`}
        >
          {starred ? "★ Cook later" : "☆ Cook later"}
        </MotionButton>
        <MotionButton
          onClick={handleCook}
          disabled={cooking}
          animate={justCooked ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-xl bg-[#1F5F45] px-4 py-3 text-sm font-medium text-white shadow-glow disabled:opacity-50"
        >
          {cooking ? "Logging..." : justCooked ? "✓ Logged!" : "I cooked this"}
        </MotionButton>
      </div>

      <SheetModal open={showCosign} onClose={() => submitCosign(false)}>
        <h3 className="text-lg font-semibold text-[#1A1D1B]">Nice cooking!</h3>
        <p className="mt-1 text-sm text-[#6B7370]">
          Want to leave a note about how it went?
        </p>
        <textarea
          value={cosignNote}
          onChange={(e) => setCosignNote(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-[#E8E6E0] p-2 text-base"
          placeholder="Optional note..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <MotionButton
            onClick={() => submitCosign(false)}
            className="rounded-xl border border-[#E8E6E0] px-4 py-3 text-sm text-[#1A1D1B]"
          >
            Skip
          </MotionButton>
          <MotionButton
            onClick={() => submitCosign(true)}
            className="rounded-xl bg-[#1F5F45] px-4 py-3 text-sm font-medium text-white"
          >
            Share cosign
          </MotionButton>
        </div>
      </SheetModal>
    </PageTransition>
  );
}
