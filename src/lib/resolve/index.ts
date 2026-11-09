import { assertSafeUrl } from "@/lib/http/guard-url";
import { resolveImdb } from "@/lib/resolve/imdb";
import { resolveMal } from "@/lib/resolve/mal";
import { parseMediaUrl } from "@/lib/resolve/parse-url";
import { resolveStreaming } from "@/lib/resolve/streaming";
import { resolveTmdb } from "@/lib/resolve/tmdb";
import type { ResolvedMedia } from "@/types/metadata/metadata";

/**
 * Turn a pasted link into an item. Throws UnsafeUrlError (route: 422) for a link outside the
 * allowlist policy; returns null when the link is supported but nothing could be read from it.
 */
export async function resolveLink(rawUrl: string): Promise<ResolvedMedia | null> {
  const parsed = parseMediaUrl(assertSafeUrl(rawUrl));
  if (parsed === null) return null;

  switch (parsed.source) {
    case "imdb":
      return resolveImdb(parsed);
    case "tmdb":
      return resolveTmdb(parsed);
    case "mal":
      return resolveMal(parsed);
    case "netflix":
    case "prime":
      return resolveStreaming(parsed);
  }
}
