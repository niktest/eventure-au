import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isDiscussionCategory, categoryLabel } from "@/lib/discussions/categories";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isDiscussionCategory(category)) return {};
  return {
    title: `${categoryLabel(category)} — Gold Coast Discussions`,
  };
}

export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isDiscussionCategory(category)) notFound();
  redirect(`/discussions?category=${category}`);
}
