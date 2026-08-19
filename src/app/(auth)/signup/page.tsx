"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { compressImage } from "@/lib/image-compression";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";
import { OAuthButtons } from "@/components/oauth-buttons";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { BirthdayPicker } from "@/components/birthday-picker";
import { hideKeyboard } from "@/lib/native";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState<LocationValue>({ country: "", state: "", city: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (!location.country || !location.city) {
      setError("City and country are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          birthday: birthday || null,
          city: location.city,
          state: location.state || null,
          country: location.country,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Account created, but sign in failed. Try logging in.");
        setLoading(false);
        return;
      }

      // Photo is optional and best-effort: a failed upload shouldn't block
      // the rest of signup, since the account already exists at this point.
      if (photoFile) {
        try {
          const compressed = await compressImage(photoFile);
          const formData = new FormData();
          formData.append("file", compressed, "photo.webp");
          await fetch("/api/account/photo", { method: "POST", body: formData });
        } catch {
          // ignore
        }
      }

      hideKeyboard();
      router.push("/onboarding/preferences");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <PageTransition className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#E8E6E0] bg-white p-8 shadow-soft">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1D1B]">
            umami
          </h1>
          <p className="mt-1 text-sm text-[#6B7370]">
            Four recipes. That&apos;s the whole surface.
          </p>

          <p className="mt-4 text-xs text-[#6B7370]">
            Fastest way in — pulls in your name, email, and photo automatically.
          </p>
          <div className="mt-3 mb-4">
            <OAuthButtons />
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7370]">
            Step 1 of 3: Profile
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <MotionButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8E6E0] bg-[#EDF3EF] text-xs text-[#6B7370]"
                aria-label="Add profile photo"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  "Add photo"
                )}
              </MotionButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <div>
                <p className="text-sm font-medium text-[#1A1D1B]">Profile photo</p>
                <p className="text-xs text-[#6B7370]">Optional. You can add or change this anytime.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">
                Password
              </label>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
              <p className="mt-1 text-xs text-[#6B7370]">At least 10 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">
                Retype password
              </label>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
              {/* Live feedback as the user types, instead of only surfacing
                  a mismatch after they submit. */}
              {confirmPassword.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    password === confirmPassword ? "text-[#1B4332]" : "text-[#B23A32]"
                  }`}
                >
                  {password === confirmPassword ? "Passwords match." : "Passwords don't match yet."}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">
                Birthday
              </label>
              <BirthdayPicker value={birthday} onChange={setBirthday} />
            </div>
            <div>
              <LocationPicker value={location} onChange={setLocation} />
            </div>

            {error && (
              <motion.p
                initial={{ x: 0 }}
                animate={{ x: [0, -6, 6, -4, 4, 0] }}
                transition={{ duration: 0.4 }}
                className="text-sm text-[#B23A32]"
              >
                {error}
              </motion.p>
            )}

            <MotionButton
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white shadow-glow disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Continue"}
            </MotionButton>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7370]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#2C5A87] underline">
            Log in
          </Link>
        </p>
      </PageTransition>
    </main>
  );
}
