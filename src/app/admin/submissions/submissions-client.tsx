"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmissionPreview, type SubmissionPreviewData } from "@/components/submission-preview";
import { LoadingOrb } from "@/components/loading-orb";

type SubmissionRow = SubmissionPreviewData & {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { name: string | null; email: string | null };
  approvedRecipe: { slug: string } | null;
};

function StatusBadge({ status }: { status: SubmissionRow["status"] }) {
  const styles: Record<SubmissionRow["status"], string> = {
    PENDING: "border-[#B45309] bg-[#FEF3E2] text-[#B45309]",
    APPROVED: "border-[#1B4332] bg-[#EDF3EF] text-[#1B4332]",
    REJECTED: "border-red-300 bg-red-50 text-red-700",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}

export function SubmissionsClient({
  pending,
  recent,
}: {
  pending: SubmissionRow[];
  recent: SubmissionRow[];
}) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<SubmissionRow | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openReview(row: SubmissionRow) {
    setReviewing(row);
    setRejecting(false);
    setReviewNote("");
    setError(null);
  }

  async function approve() {
    if (!reviewing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${reviewing.id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Approve failed");
      }
      setReviewing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reviewing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${reviewing.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: reviewNote.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Reject failed");
      }
      setReviewing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[#1A1D1B]">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[#6B7370]">Nothing waiting on review.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openReview(row)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#E8E6E0] bg-white p-3 text-left hover:border-[#1B4332]"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EDF3EF]">
                  {row.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1A1D1B]">{row.title}</p>
                  <p className="truncate text-xs text-[#6B7370]">
                    {row.cuisine.name} · {row.user.name ?? row.user.email ?? "Unknown"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#2C5A87] underline">Review</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-[#1A1D1B]">Recently reviewed</h2>
          <div className="space-y-2">
            {recent.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-[#E8E6E0] bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1A1D1B]">{row.title}</p>
                  <p className="truncate text-xs text-[#6B7370]">
                    {row.cuisine.name} · {row.user.name ?? row.user.email ?? "Unknown"}
                    {row.status === "APPROVED" && row.approvedRecipe && (
                      <>
                        {" · "}
                        <a href={`/recipe/${row.approvedRecipe.slug}`} className="underline">
                          view live
                        </a>
                      </>
                    )}
                    {row.status === "REJECTED" && row.reviewNote && <> · {row.reviewNote}</>}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl bg-[#FBFAF7] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1A1D1B]">Review submission</h2>
              <button
                type="button"
                onClick={() => setReviewing(null)}
                className="rounded-full border border-[#E8E6E0] px-3 py-1 text-xs text-[#6B7370]"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <SubmissionPreview submission={reviewing} />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {rejecting && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-[#6B7370]">
                  Reason (optional, shown to the submitter)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            )}

            <div className="mt-5 flex gap-3 border-t border-[#E8E6E0] pt-4">
              {!rejecting ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    disabled={busy}
                    className="flex-1 rounded-xl border border-red-300 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    {busy ? <LoadingOrb size={20} /> : "Reject"}
                  </button>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <LoadingOrb size={20} theme="dark" /> Approving…
                      </span>
                    ) : (
                      "Approve"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    disabled={busy}
                    className="flex-1 rounded-xl border border-[#E8E6E0] py-3 text-sm font-medium text-[#1A1D1B] disabled:opacity-50"
                  >
                    {busy ? <LoadingOrb size={20} /> : "Back"}
                  </button>
                  <button
                    type="button"
                    onClick={reject}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-red-700 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <LoadingOrb size={20} theme="dark" /> Rejecting…
                      </span>
                    ) : (
                      "Confirm reject"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
