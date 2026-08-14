"use client";

import { useState } from "react";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  city: string | null;
  country: string | null;
  isAdmin: boolean;
  isPremium: boolean;
  createdAt: string;
  diets: string[];
  allergens: string[];
  customAllergens: string[];
  cookedCount: number;
  savedCount: number;
};

function PromoteForm({ onPromoted }: { onPromoted: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, isAdmin: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Couldn't promote that user.");
        return;
      }
      onPromoted(trimmed);
      setEmail("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E8E6E0] bg-white p-4">
      <p className="text-sm font-medium text-[#1A1D1B]">Grant admin access</p>
      <p className="mt-1 text-xs text-[#6B7370]">
        Enter the email of an existing account to make them an admin.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="flex-1 rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
        />
        <button
          onClick={submit}
          disabled={pending || !email.trim()}
          className="shrink-0 rounded-lg bg-[#1B4332] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Promote"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AdminUsersClient({
  users: initial,
  canManageAdmins,
}: {
  users: AdminUserRow[];
  canManageAdmins: boolean;
}) {
  const [users, setUsers] = useState(initial);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);

  function handlePromoted(email: string) {
    setUsers((prev) =>
      prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, isAdmin: true } : u)),
    );
  }

  async function togglePremium(id: string, current: boolean) {
    const next = !current;
    setTogglingId(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isPremium: next } : u)));
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: next }),
      });
      if (!res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isPremium: current } : u)));
      }
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isPremium: current } : u)));
    } finally {
      setTogglingId(null);
    }
  }

  async function toggleAdmin(id: string, current: boolean) {
    const next = !current;
    setTogglingAdminId(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin: next } : u)));
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: next }),
      });
      if (!res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin: current } : u)));
      }
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin: current } : u)));
    } finally {
      setTogglingAdminId(null);
    }
  }

  return (
    <div>
      {canManageAdmins && <PromoteForm onPromoted={handlePromoted} />}

      <div className="mt-6 space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl border border-[#E8E6E0] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#1A1D1B]">
                  {u.name}
                  {u.isAdmin && (
                    <span className="ml-2 rounded-full bg-[#EDF3EF] px-2 py-0.5 text-[10px] font-medium text-[#1B4332]">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#6B7370]">{u.email}</p>
                <p className="mt-1 text-xs text-[#6B7370]">
                  {[u.city, u.country].filter(Boolean).join(", ") || "No location set"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-right text-xs text-[#6B7370]">
                <div>
                  <p className="text-base font-semibold text-[#1A1D1B]">{u.cookedCount}</p>
                  <p>Cooked</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-[#1A1D1B]">{u.savedCount}</p>
                  <p>Saved</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePremium(u.id, u.isPremium)}
                  disabled={togglingId === u.id}
                  className={`rounded-full border px-3 py-2 text-xs transition disabled:opacity-50 ${
                    u.isPremium
                      ? "border-[#1B4332] bg-[#EDF3EF] text-[#1B4332]"
                      : "border-[#E8E6E0] text-[#6B7370] hover:bg-[#EDF3EF]"
                  }`}
                >
                  {u.isPremium ? "Premium" : "Free"}
                </button>
                {canManageAdmins && (
                  <button
                    type="button"
                    onClick={() => toggleAdmin(u.id, u.isAdmin)}
                    disabled={togglingAdminId === u.id}
                    className={`rounded-full border px-3 py-2 text-xs transition disabled:opacity-50 ${
                      u.isAdmin
                        ? "border-[#B45309] bg-[#FBEBE9] text-[#B45309]"
                        : "border-[#E8E6E0] text-[#6B7370] hover:bg-[#EDF3EF]"
                    }`}
                  >
                    {u.isAdmin ? "Revoke admin" : "Grant admin"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {u.diets.map((d) => (
                <span key={d} className="rounded-full bg-[#EDF3EF] px-2 py-1 text-[11px] text-[#1B4332]">
                  {d}
                </span>
              ))}
              {u.allergens.map((a) => (
                <span key={a} className="rounded-full bg-[#FBEBE9] px-2 py-1 text-[11px] text-[#B23A32]">
                  {a}
                </span>
              ))}
              {u.customAllergens.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-[#FBEBE9] px-2 py-1 text-[11px] text-[#B23A32]"
                >
                  {a} (custom)
                </span>
              ))}
              {u.diets.length === 0 && u.allergens.length === 0 && u.customAllergens.length === 0 && (
                <span className="text-[11px] text-[#6B7370]">No preferences set</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
