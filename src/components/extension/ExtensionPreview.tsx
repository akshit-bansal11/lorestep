import StatusChip from "@/components/log/StatusChip";
import { EXTENSION_PREVIEW_STATES } from "@/constants/extension/preview";
import type { ExtensionPreviewProps } from "@/types/extension/extension-preview";
import { cn } from "@/utils/cn";

export default function ExtensionPreview({ className }: ExtensionPreviewProps) {
  return (
    <figure aria-hidden="true" className={cn("m-0 flex flex-col gap-4", className)}>
      <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-card bg-raise">
        <div className="absolute top-0 right-0 size-12 bg-status-in-progress [clip-path:polygon(0_0,100%_0,100%_100%)]" />
      </div>
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
