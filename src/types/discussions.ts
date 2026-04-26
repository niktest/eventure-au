import type { DiscussionCategory } from "@/lib/discussions/categories";

export type { DiscussionCategory };

export interface ThreadAuthor {
  id: string;
  handle: string;
  name: string | null;
}

export interface LinkedEventSummary {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string | null;
  city: string;
  imageUrl: string | null;
  venueName: string | null;
}

export interface ThreadSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: DiscussionCategory;
  city: string;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  hiddenAt: string | null;
  upvoteCount: number;
  replyCount: number;
  upvotedByMe: boolean;
  linkedEvent: LinkedEventSummary | null;
}

export interface ThreadDetail extends ThreadSummary {
  body: string;
  isAuthor: boolean;
}

export interface ReplySummary {
  id: string;
  threadId: string;
  body: string;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  hiddenAt: string | null;
  upvoteCount: number;
  upvotedByMe: boolean;
  isAuthor: boolean;
}

export interface ThreadListResponse {
  threads: ThreadSummary[];
  nextCursor: string | null;
}

export interface TrendingEvent {
  slug: string;
  name: string;
  threadCount: number;
}

export type ThreadSort = "hot" | "new" | "top";
export type ReplySort = "top" | "new";
