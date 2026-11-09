import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from "@/constants/metadata/metadata";

export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

/**
 * Per-instance, best-effort cache: every serverless instance holds its own copy and loses it on
 * cold start, so it trims provider calls but never guarantees a hit. Bounded by evicting the
 * oldest entry; a Map iterates in insertion order.
 */
export function createTtlCache<V>(): TtlCache<V> {
  const entries = new Map<string, { at: number; value: V }>();
  return {
    get(key) {
      const hit = entries.get(key);
      if (hit === undefined) return undefined;
      if (Date.now() - hit.at >= CACHE_TTL_MS) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { at: Date.now(), value });
      const oldest = entries.keys().next();
      if (entries.size > CACHE_MAX_ENTRIES && !oldest.done) entries.delete(oldest.value);
    },
  };
}
