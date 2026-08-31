"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MotionButton } from "@/components/motion-button";
import { LoadingOrb } from "@/components/loading-orb";

export function AccountSettingsSection({
  email,
  timezone,
  hasPassword,
}: {
  email: string;
  timezone: string | null;
  hasPassword: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordIsSet, setPasswordIsSet] = useState(hasPassword);

  async function changePassword() {
    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordIsSet ? currentPassword : undefined,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong changing your password.");
        return;
      }
      setSaved(true);
      setPasswordIsSet(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CollapsibleSection title="Account settings">
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6B7370]">Email</dt>
          <dd className="mt-1 text-[#1A1D1B]">{email}</dd>
        </div>
        {timezone && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#6B7370]">Timezone</dt>
            <dd className="mt-1 text-[#1A1D1B]">{timezone}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 border-t border-[#E8E6E0] pt-5">
        <p className="text-sm font-medium text-[#1A1D1B]">
          {passwordIsSet ? "Change password" : "Set a password"}
        </p>
        {!passwordIsSet && (
          <p className="mt-1 text-xs text-[#6B7370]">
            Your account was created via sign-in with Google or Apple. Set a password to also be
            able to sign in with your email.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {passwordIsSet && (
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
            />
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 10 characters)"
            className="w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <MotionButton
            type="button"
            onClick={changePassword}
            disabled={saving}
            className="shrink-0 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <LoadingOrb size={20} theme="dark" /> Saving...
              </span>
            ) : passwordIsSet ? (
              "Change password"
            ) : (
              "Set password"
            )}
          </MotionButton>
          {saved && <span className="text-sm text-[#1B4332]">Saved!</span>}
        </div>
        {error && <p className="mt-2 text-sm text-[#B23A32]">{error}</p>}
        <p className="mt-3 text-xs text-[#6B7370]">
          Forgot your current password?{" "}
          <Link href="/forgot-password" className="text-[#2C5A87] underline">
            Reset it by email
          </Link>{" "}
          instead.
        </p>
      </div>

      <div className="mt-5 border-t border-[#E8E6E0] pt-5">
        <MotionButton
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          whileHover={{ y: -2 }}
          className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#B23A32] transition-colors hover:bg-[#EDF3EF]"
        >
          Sign out
        </MotionButton>
      </div>
    </CollapsibleSection>
  );
}
