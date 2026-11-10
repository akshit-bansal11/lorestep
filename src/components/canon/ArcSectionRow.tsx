import { TITLE_CLASS } from "@/constants/canon/ui";
import type { Arc } from "@/types/canon/canon";

interface ArcSectionRowProps {
  arc: Arc;
  count: number;
  span: number;
}

export default function ArcSectionRow({ arc, count, span }: ArcSectionRowProps) {
  return (
    <tr>
      <td className="border-line border-b bg-raise px-2 py-2" colSpan={span}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`${TITLE_CLASS} text-[15px] text-ink`}>{arc.name}</span>
          <span className="text-[10px] text-faint tabular-nums">{count} games</span>
          <span className="text-[11px] text-muted">{arc.blurb}</span>
        </div>
      </td>
    </tr>
  );
}
