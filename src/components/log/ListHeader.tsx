import Link from "next/link";
import { APP_TITLE_CLASS } from "@/constants/canon/ui";
import { LOG_DANGER_CLASS, LOG_PRIMARY_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LIST_LIMITS } from "@/constants/log/lists";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import type { List } from "@/types/log/list";
import { countLabel, kindsLabel } from "@/utils/log/list-kinds";

const copy = LISTS_COPY;

interface ListHeaderProps {
  list: List;
  onRename: () => void;
  onDelete: () => void;
  onAdd: () => void;
}

/** A list's name, description, count and its three actions; Add is off at the item cap. */
export default function ListHeader({ list, onRename, onDelete, onAdd }: ListHeaderProps) {
  const full = list.itemCount >= LIST_LIMITS.itemsPerList;
  return (
    <header className="flex flex-col gap-2">
      <Link
        className="inline-flex min-h-11 items-center text-[13px] text-muted hover:text-ink"
        href="/lists"
      >
        {copy.back}
      </Link>
      <h1 className={APP_TITLE_CLASS}>{list.name}</h1>
      <p className="text-[12px] text-muted">
        {countLabel(list.itemCount)} · {kindsLabel(list.kinds)}
      </p>
      {list.description !== "" && (
        <p className="max-w-prose text-[13px] text-ink">{list.description}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button className={LOG_PRIMARY_CLASS} disabled={full} onClick={onAdd} type="button">
          {copy.detail.add}
        </button>
        <button className={LOG_SECONDARY_CLASS} onClick={onRename} type="button">
          {copy.detail.edit}
        </button>
        <button className={LOG_DANGER_CLASS} onClick={onDelete} type="button">
          {copy.detail.delete}
        </button>
      </div>
      {full && (
        <p className="text-[13px] text-muted">
          {copy.detail.itemCapReached.replace("{max}", String(LIST_LIMITS.itemsPerList))}
        </p>
      )}
    </header>
  );
}
