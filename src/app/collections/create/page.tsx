"use client";

import Link from "next/link";
import { useState } from "react";

const CATEGORIES = ["Music", "Arts", "Food", "Sports", "Nightlife"] as const;

export default function CreateCollectionPage() {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  function toggleCategory(cat: string) {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/community"
            className="inline-flex items-center gap-1 font-body text-sm text-secondary hover:text-primary transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Community
          </Link>
          <h1 className="font-display text-4xl font-extrabold text-on-surface tracking-tight">
            Create a Collection
          </h1>
          <p className="font-body text-base text-secondary mt-2">
            Group your favourite events into a shareable collection for the community.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-8"
        >
          {/* Collection Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="font-body text-sm font-semibold text-on-surface">
              Collection Name
            </label>
            <div className="relative">
              <input
                id="name"
                type="text"
                placeholder="e.g. Weekend Warriors"
                className="w-full rounded-lg border border-outline bg-surface py-3 px-4 pr-10 font-body text-base text-on-surface placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
                edit
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="font-body text-sm font-semibold text-on-surface">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Tell others what this collection is about..."
              className="w-full rounded-lg border border-outline bg-surface py-3 px-4 font-body text-base text-on-surface placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <label className="font-body text-sm font-semibold text-on-surface">Cover Image</label>
            <div className="flex items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-outline bg-surface hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="flex flex-col items-center gap-2 text-secondary group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[36px]">upload</span>
                <span className="font-body text-sm font-medium">Drop image or click to browse</span>
                <span className="font-body text-xs text-secondary">PNG, JPG up to 5MB</span>
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div className="space-y-2">
            <label className="font-body text-sm font-semibold text-on-surface">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface border border-outline text-on-surface hover:border-primary"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="space-y-2">
            <label className="font-body text-sm font-semibold text-on-surface">Privacy</label>
            <div className="flex rounded-lg border border-outline overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-body text-sm font-semibold transition-all ${
                  isPublic
                    ? "bg-primary text-on-primary"
                    : "bg-surface text-on-surface hover:bg-surface-bright"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-body text-sm font-semibold transition-all ${
                  !isPublic
                    ? "bg-primary text-on-primary"
                    : "bg-surface text-on-surface hover:bg-surface-bright"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Private
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-body text-base font-semibold py-3.5 rounded-full hover:shadow-md active:scale-[0.99] transition-all"
          >
            Create Collection
          </button>
        </form>
      </div>
    </div>
  );
}
