import { MEDIA_KINDS } from "@/constants/metadata/metadata";
import type { MediaKind } from "@/types/metadata/metadata";

export function isMediaKind(value: string): value is MediaKind {
  return MEDIA_KINDS.some((kind) => kind === value);
}
