"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/recipe-form-fields";

type CookbookRow = { id: string; name: string; recipeCount: number };

// Rename/delete management for admin-curated cookbooks. Recipes are added or
// removed from a cookbook via the Cookbooks dropdown on the Recipes tab, not
// here — this page only manages the collections themselves.
export function CookbooksClient({ cookbooks }: { cookbooks: CookbookRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(cookbooks);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cookbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setName("");
      router.refresh();
      const { cookbook } = (await res.json()) as { cookbook: CookbookRow };
      setRows((prev) =>
        prev.some((r) => r.id === cookbook.id)
          ? prev
          : [...prev, { ...cookbook, recipeCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(row: CookbookRow) {
    setEditingId(row.id);
    setEditingName(row.name);
  }

  async function saveRename(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingRename(true);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/cookbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError((prev) => ({ ...prev, [id]: body.error ?? "Failed to rename" }));
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: trimmed } : r)));
      setEditingId(null);
      router.refresh();
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Failed to rename" }));
    } finally {
      setSavingRename(false);
    }
  }

  async function remove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row && row.recipeCount > 0) {
      const ok = window.confirm(
        `"${row.name}" has ${row.recipeCount} recipe(s) in it. Deleting it will remove it from the dashboard for everyone. Continue?`,
      );
      if (!ok) return;
    }

    setDeletingId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/cookbooks/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError((prev) => ({ ...prev, [id]: body.error ?? "Failed to remove" }));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Failed to remove" }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#1A1D1B]">Collections</h2>
      <p className="mt-0.5 text-xs text-[#6B7370]">
        Only cookbooks with at least one eligible recipe for a given user appear on their
        dashboard.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E6E0] px-3 py-2"
          >
            {editingId === row.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  className={inputClass()}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(row.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveRename(row.id)}
                  disabled={savingRename || !editingName.trim()}
                  className="shrink-0 rounded-lg border border-[#1F5F45] bg-[#EDF3EF] px-2 py-1 text-xs text-[#1F5F45] disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="shrink-0 rounded-lg border border-[#E8E6E0] px-2 py-1 text-xs text-[#6B7370]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <span className="text-sm text-[#1A1D1B]">{row.name}</span>
                <span className="ml-2 text-xs text-[#6B7370]">
                  ({row.recipeCount} recipe{row.recipeCount === 1 ? "" : "s"})
                </span>
                {rowError[row.id] && <p className="mt-1 text-xs text-red-600">{rowError[row.id]}</p>}
              </div>
            )}

            {editingId !== row.id && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="rounded-lg border border-[#E8E6E0] px-2 py-1 text-xs text-[#1A1D1B]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  disabled={deletingId === row.id}
                  className="rounded-lg border border-[#E8E6E0] px-2 py-1 text-xs text-[#6B7370] hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === row.id ? "Removing…" : "Remove"}
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-[#6B7370]">None yet.</li>}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          className={inputClass()}
          placeholder="New cookbook name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
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
    </section>
  );
}
