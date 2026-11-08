import type { z } from "zod";

import type { SYNC_KINDS, SYNC_PLATFORMS } from "@/constants/sync/sync";
import type { syncPullQuerySchema } from "@/schemas/sync/pull";
import type { syncMarkSchema } from "@/schemas/sync/push";
import type { Entry } from "@/types/log/entry";

export type SyncKind = (typeof SYNC_KINDS)[number];
export type SyncPlatform = (typeof SYNC_PLATFORMS)[number];

export type SyncMark = z.infer<typeof syncMarkSchema>;
export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;

/** One of the caller's live entries that a mark could land on. `statusAt` is epoch ms. */
export interface SyncCandidate {
  id: string;
  kind: string;
  titleNorm: string;
  year: number | null;
  status: string | null;
  statusAt: number | null;
  /** Has a rating, notes, a shelf or a list membership, so a Dogear clear keeps it (D-15). */
  keep: boolean;
}

/** What title matching (D-14 step 2) compares. */
export interface SyncMatchInput {
  titleNorm: string;
  kind: SyncKind | undefined;
  year: number | undefined;
}

/** An existing `entry_links` row of the caller. */
export interface SyncLink {
  platform: string;
  platformId: string;
  entryId: string;
}

/** Where one pushed mark ended up. `entryId` is null for a clear of an unknown title. */
export interface SyncResult {
  platform: SyncPlatform;
  platformId: string;
  entryId: string | null;
  status: string | null;
  statusAt: string | null;
}

/** A write the push planner asks for; `push.ts` turns each into one statement of the batch. */
export type SyncOp =
  | {
      type: "create";
      id: string;
      kind: SyncKind;
      title: string;
      titleNorm: string;
      year: number | null;
      status: string;
      statusAt: number;
    }
  | { type: "status"; id: string; status: string | null; statusAt: number; remove: boolean }
  | {
      type: "link";
      platform: SyncPlatform;
      platformId: string;
      entryId: string;
      url: string | null;
    }
  | { type: "touch"; id: string };

export interface PushPlan {
  ops: SyncOp[];
  results: SyncResult[];
  applied: number;
  skipped: number;
  creates: number;
}

/** 200 body of POST /api/v1/sync/push. */
export interface PushOutcome {
  applied: number;
  skipped: number;
  results: SyncResult[];
}

export interface SyncChangeLink {
  platform: string;
  platformId: string;
  url: string | null;
}

export interface SyncChange {
  entry: Entry;
  links: SyncChangeLink[];
  deleted: boolean;
}

/** 200 body of GET /api/v1/sync. `cursor` is the `since` for the next pull. */
export interface SyncPage {
  changes: SyncChange[];
  cursor: string | null;
}
