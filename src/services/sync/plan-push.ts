import { ENTRY_LIMITS } from "@/constants/log/entries";
import { SYNC_LIMITS } from "@/constants/sync/sync";
import { kindForNew, matchEntry } from "@/services/sync/match-entry";
import type { PushPlan, SyncCandidate, SyncLink, SyncMark } from "@/types/sync/sync";
import { normTitle } from "@/utils/log/norm-title";

const linkKey = (platform: string, platformId: string) => `${platform}:${platformId}`;

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

const markId = ({ platform, platformId }: SyncMark) => ({ platform, platformId });

/**
 * Pure push planner: marks in order against the caller's own links and live candidates (both read
 * owner-scoped by `push.ts`; a link to an entry not among the candidates, deleted or foreign, is
 * ignored and re-pointed). Per mark (D-14): link, else exactly one title match, else create.
 * Last write wins on `at` against `statusAt`; an equal or older mark is skipped, so resending a
 * push changes nothing. A clear (`status: null`) keeps the entry when it holds Plotline-side data
 * and soft-deletes it otherwise (D-15); a clear for a title the server never had is skipped.
 */
export function planPush(
  marks: readonly SyncMark[],
  links: readonly SyncLink[],
  candidates: readonly SyncCandidate[],
  now: number,
  newId: () => string,
): PushPlan {
  const live = new Map(candidates.map((candidate) => [candidate.id, { ...candidate }]));
  const linked = new Map(
    links.map((link) => [linkKey(link.platform, link.platformId), link.entryId]),
  );
  const plan: PushPlan = { ops: [], results: [], applied: 0, skipped: 0, creates: 0 };

  for (const mark of marks) {
    const key = linkKey(mark.platform, mark.platformId);
    const at = Math.min(mark.at, now + SYNC_LIMITS.futureSkewMs);
    const titleNorm = normTitle(mark.title);
    const linkedId = linked.get(key);
    let entry =
      (linkedId === undefined ? undefined : live.get(linkedId)) ??
      matchEntry(live.values(), { titleNorm, kind: mark.kind, year: mark.year });
    let changed = false;

    if (entry === null || entry === undefined) {
      if (mark.status === null) {
        plan.skipped += 1;
        plan.results.push({ ...markId(mark), entryId: null, status: null, statusAt: null });
        continue;
      }
      const kind = kindForNew(mark.kind, mark.platform);
      entry = {
        id: newId(),
        kind,
        titleNorm,
        year: mark.year ?? null,
        status: mark.status,
        statusAt: at,
        keep: false,
      };
      live.set(entry.id, entry);
      plan.ops.push({
        type: "create",
        id: entry.id,
        kind,
        title: mark.title.slice(0, ENTRY_LIMITS.title),
        titleNorm,
        year: entry.year,
        status: mark.status,
        statusAt: at,
      });
      plan.creates += 1;
      changed = true;
    } else if (entry.statusAt === null || at > entry.statusAt) {
      const remove = mark.status === null && !entry.keep;
      entry.status = mark.status;
      entry.statusAt = at;
      if (remove) live.delete(entry.id);
      plan.ops.push({ type: "status", id: entry.id, status: mark.status, statusAt: at, remove });
      changed = true;
    }

    if (changed) plan.applied += 1;
    else plan.skipped += 1;

    if (linked.get(key) !== entry.id) {
      linked.set(key, entry.id);
      plan.ops.push({ type: "link", ...markId(mark), entryId: entry.id, url: mark.url ?? null });
      // A new link alone still has to reach other devices through the pull cursor.
      if (!changed) plan.ops.push({ type: "touch", id: entry.id });
    }

    plan.results.push({
      ...markId(mark),
      entryId: entry.id,
      status: entry.status,
      statusAt: iso(entry.statusAt),
    });
  }
  return plan;
}
