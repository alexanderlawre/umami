import { attributeLabel } from "@/lib/recipe-tags";

// Read-only recipe detail view for a pending/reviewed submission — used by
// the admin review modal. Admins are approving/rejecting, not editing, so
// this intentionally has no form inputs.
export type SubmissionPreviewData = {
  title: string;
  shortDescription: string;
  note: string;
  introCopy: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: string;
  effortTier: string;
  batchFriendly: boolean;
  attributes: string[];
  mealSlot: string[];
  imageUrl: string | null;
  imageCredit: string | null;
  cuisine: { name: string };
  dietTags: { id: string; name: string }[];
  allergenTags: { id: string; name: string }[];
  caloriesPerServing: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  ingredients: {
    component: string | null;
    quantity: string;
    unit: string | null;
    item: string;
    prepNote: string | null;
    optional: boolean;
  }[];
  steps: { text: string; durationMinutes: number | null }[];
};

export function SubmissionPreview({ submission }: { submission: SubmissionPreviewData }) {
  return (
    <div className="space-y-5">
      {submission.imageUrl && (
        <div className="h-48 w-full overflow-hidden rounded-xl bg-[#EDF3EF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={submission.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-[#1A1D1B]">{submission.title}</h3>
        <p className="mt-1 text-sm text-[#6B7370]">{submission.shortDescription}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[#6B7370]">
        <span className="rounded-full border border-[#E8E6E0] px-2 py-1">{submission.cuisine.name}</span>
        <span className="rounded-full border border-[#E8E6E0] px-2 py-1">{submission.difficulty}</span>
        <span className="rounded-full border border-[#E8E6E0] px-2 py-1">{submission.effortTier}</span>
        <span className="rounded-full border border-[#E8E6E0] px-2 py-1">
          {submission.servings} servings
        </span>
        <span className="rounded-full border border-[#E8E6E0] px-2 py-1">
          {submission.prepMinutes + submission.cookMinutes} min
        </span>
        {submission.batchFriendly && (
          <span className="rounded-full border border-[#E8E6E0] px-2 py-1">Batch friendly</span>
        )}
      </div>

      {(submission.dietTags.length > 0 || submission.allergenTags.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {submission.dietTags.map((d) => (
            <span key={d.id} className="rounded-full bg-[#EDF3EF] px-2 py-1 text-[#1F5F45]">
              {d.name}
            </span>
          ))}
          {submission.allergenTags.map((a) => (
            <span key={a.id} className="rounded-full bg-red-50 px-2 py-1 text-red-700">
              Contains {a.name}
            </span>
          ))}
        </div>
      )}

      {submission.attributes.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-[#6B7370]">
          {submission.attributes.map((a) => (
            <span key={a} className="rounded-full border border-[#E8E6E0] px-2 py-1">
              {attributeLabel(a)}
            </span>
          ))}
        </div>
      )}

      {(submission.caloriesPerServing || submission.proteinGrams || submission.carbsGrams || submission.fatGrams) && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs text-[#6B7370]">
          <div>
            <div className="font-semibold text-[#1A1D1B]">{submission.caloriesPerServing ?? "—"}</div>
            cal
          </div>
          <div>
            <div className="font-semibold text-[#1A1D1B]">{submission.proteinGrams ?? "—"}</div>
            protein (g)
          </div>
          <div>
            <div className="font-semibold text-[#1A1D1B]">{submission.carbsGrams ?? "—"}</div>
            carbs (g)
          </div>
          <div>
            <div className="font-semibold text-[#1A1D1B]">{submission.fatGrams ?? "—"}</div>
            fat (g)
          </div>
        </div>
      )}

      {submission.introCopy && (
        <p className="whitespace-pre-wrap text-sm text-[#1A1D1B]">{submission.introCopy}</p>
      )}
      {submission.note && (
        <p className="whitespace-pre-wrap text-sm text-[#6B7370] italic">{submission.note}</p>
      )}

      <div>
        <h4 className="mb-2 text-xs font-medium text-[#6B7370]">Ingredients</h4>
        <ul className="space-y-1 text-sm text-[#1A1D1B]">
          {submission.ingredients.map((ing, i) => (
            <li key={i}>
              {ing.quantity} {ing.unit ?? ""} {ing.item}
              {ing.optional && <span className="text-[#6B7370]"> (optional)</span>}
              {ing.prepNote && <span className="text-[#6B7370]">, {ing.prepNote}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium text-[#6B7370]">Steps</h4>
        <ol className="list-decimal space-y-2 pl-4 text-sm text-[#1A1D1B]">
          {submission.steps.map((s, i) => (
            <li key={i}>
              {s.text}
              {s.durationMinutes != null && (
                <span className="text-[#6B7370]"> ({s.durationMinutes} min)</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {submission.imageCredit && (
        <p className="text-xs text-[#6B7370]">Photo credit: {submission.imageCredit}</p>
      )}
    </div>
  );
}
