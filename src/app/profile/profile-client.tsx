"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { CookedRecipeCard, type CookedRecipeData } from "@/components/recipe-card-shell";
import { compressImage } from "@/lib/image-compression";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { BirthdayPicker } from "@/components/birthday-picker";
import { LoadingOrb } from "@/components/loading-orb";

export function ProfileClient({
  initialName,
  email,
  initialBirthday,
  initialCity,
  initialState,
  initialCountry,
  initialImage,
  cooked,
}: {
  initialName: string;
  email: string;
  initialBirthday: string;
  initialCity: string;
  initialState: string;
  initialCountry: string;
  initialImage: string | null;
  cooked: CookedRecipeData[];
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [birthday, setBirthday] = useState(initialBirthday);
  const [location, setLocation] = useState<LocationValue>({
    country: initialCountry,
    state: initialState,
    city: initialCity,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialImage);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setPhotoPreview(previewUrl);

      const formData = new FormData();
      formData.append("file", compressed, "photo.webp");
      const res = await fetch("/api/account/photo", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong uploading your photo.");
        return;
      }
      setPhotoPreview(data.imageUrl ?? previewUrl);
      await update({ image: data.imageUrl ?? previewUrl });
      router.refresh();
    } catch {
      setError("Something went wrong uploading your photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save() {
    const trimmedName = name.trim();
    const trimmedCountry = location.country.trim();
    if (!trimmedName) {
      setError("Name can't be empty.");
      return;
    }
    if (!trimmedCountry) {
      setError("Country can't be empty.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          birthday: birthday || null,
          city: location.city.trim() || null,
          state: location.state.trim() || null,
          country: trimmedCountry,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong saving your profile.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <PageTransition>
        <h1 className="text-2xl font-bold text-[#1A1D1B]">Profile</h1>

        <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <MotionButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              whileHover={{ y: -2 }}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8E6E0] bg-[#EDF3EF] text-xs text-[#6B7370] disabled:opacity-50"
              aria-label="Change profile photo"
            >
              <AnimatePresence mode="wait" initial={false}>
                {photoPreview ? (
                  <motion.img
                    key={photoPreview}
                    src={photoPreview}
                    alt=""
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : (
                  <motion.span
                    key="no-photo"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Add photo
                  </motion.span>
                )}
              </AnimatePresence>
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
              <p className="flex items-center gap-2 text-xs text-[#6B7370]">
                {uploadingPhoto ? (
                  <>
                    <LoadingOrb size={20} /> Uploading...
                  </>
                ) : (
                  "Click to change."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setSaved(false);
                  setName(e.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1D1B]">Birthday</label>
              <BirthdayPicker
                value={birthday}
                onChange={(next) => {
                  setSaved(false);
                  setBirthday(next);
                }}
              />
            </div>
          </div>

          <div className="mt-4">
            <LocationPicker
              value={location}
              onChange={(next) => {
                setSaved(false);
                setLocation(next);
              }}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <MotionButton
              type="button"
              onClick={save}
              disabled={saving}
              className="shrink-0 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoadingOrb size={20} theme="dark" /> Saving...
                </span>
              ) : (
                "Save"
              )}
            </MotionButton>
            {saved && <span className="text-sm text-[#1B4332]">Saved!</span>}
          </div>
          {error && <p className="mt-2 text-sm text-[#B23A32]">{error}</p>}

          <p className="mt-4 text-sm text-[#6B7370]">{email}</p>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-[#1A1D1B]">Cook book</h2>
          <p className="mt-1 text-sm text-[#6B7370]">
            Recipes you've marked as cooked show up here.
          </p>

          {cooked.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B7370]">
              Nothing cooked yet. Mark a recipe as cooked from your dashboard to add it here.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cooked.map((recipe) => (
                <CookedRecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </main>
  );
}
