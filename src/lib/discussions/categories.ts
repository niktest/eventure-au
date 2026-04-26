export type DiscussionCategory =
  | "general"
  | "music"
  | "festivals"
  | "nightlife"
  | "markets"
  | "family"
  | "food_drink"
  | "arts"
  | "comedy"
  | "theatre"
  | "outdoor"
  | "community";

export const DISCUSSION_CATEGORIES: ReadonlyArray<{
  value: DiscussionCategory;
  label: string;
  icon: string;
}> = [
  { value: "general", label: "General", icon: "forum" },
  { value: "music", label: "Music", icon: "music_note" },
  { value: "festivals", label: "Festivals", icon: "festival" },
  { value: "nightlife", label: "Nightlife", icon: "nightlife" },
  { value: "markets", label: "Markets", icon: "storefront" },
  { value: "family", label: "Family", icon: "family_restroom" },
  { value: "food_drink", label: "Food & Drink", icon: "restaurant" },
  { value: "arts", label: "Arts", icon: "palette" },
  { value: "comedy", label: "Comedy", icon: "theater_comedy" },
  { value: "theatre", label: "Theatre", icon: "theaters" },
  { value: "outdoor", label: "Outdoor", icon: "park" },
  { value: "community", label: "Community", icon: "groups" },
];

const CATEGORY_VALUES = new Set<string>(
  DISCUSSION_CATEGORIES.map((c) => c.value)
);

export function isDiscussionCategory(v: unknown): v is DiscussionCategory {
  return typeof v === "string" && CATEGORY_VALUES.has(v);
}

export function categoryLabel(value: DiscussionCategory): string {
  return (
    DISCUSSION_CATEGORIES.find((c) => c.value === value)?.label ??
    value.replace("_", " & ")
  );
}

export function categoryIcon(value: DiscussionCategory): string {
  return DISCUSSION_CATEGORIES.find((c) => c.value === value)?.icon ?? "forum";
}
