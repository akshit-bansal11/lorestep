import StatusChip from "@/components/log/StatusChip";
import { TITLE_CLASS } from "@/constants/canon/ui";
import { EXTENSION_PREVIEW_POSTERS, EXTENSION_PREVIEW_STATES } from "@/constants/extension/preview";
import type { ExtensionPreviewProps } from "@/types/extension/extension-preview";
import { cn } from "@/utils/cn";

export default function ExtensionPreview({ className }: ExtensionPreviewProps) {
  return (
    <figure aria-hidden="true" className={cn("m-0 flex flex-col gap-4", className)}>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {EXTENSION_PREVIEW_POSTERS.map((poster) => (
          <li
            key={poster.title}
            className={cn(
              "relative flex aspect-[2/3] items-end overflow-hidden rounded-card p-3 text-ink text-lg sm:p-4 sm:text-2xl",
              TITLE_CLASS,
              poster.surface,
            )}
          >
            {poster.title}
            {poster.fold !== null && (
              <span
                className={cn(
                  "absolute top-0 right-0 size-12 [clip-path:polygon(0_0,100%_0,100%_100%)]",
                  poster.fold,
                )}
              />
            )}
          </li>
        ))}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {EXTENSION_PREVIEW_STATES.map((status) => (
          <li key={status}>
            <StatusChip status={status} kind="series" />
          </li>
        ))}
      </ul>
      <figcaption className="text-[13px] text-faint">Illustration</figcaption>
    </figure>
  );
}
