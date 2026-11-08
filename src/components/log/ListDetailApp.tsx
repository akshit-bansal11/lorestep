"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import DeleteListDialog from "@/components/log/DeleteListDialog";
import ListAddDialog from "@/components/log/ListAddDialog";
import ListFormDialog from "@/components/log/ListFormDialog";
import ListHeader from "@/components/log/ListHeader";
import ListItemRow, { moveButtonId } from "@/components/log/ListItemRow";
import NoticeBar from "@/components/log/NoticeBar";
import OfflineNote from "@/components/log/OfflineNote";
import { CARD_CLASS, PAGE_CLASS } from "@/constants/canon/ui";
import { LOG_PRIMARY_CLASS, LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import { useListDetail } from "@/hooks/log/use-list-detail";
import { useOnline } from "@/hooks/log/use-online";
import type { Notice } from "@/types/log/library";
import type { ListItem } from "@/types/log/list";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";

const copy = LISTS_COPY;
const SKELETON_ROWS = ["a", "b", "c", "d"] as const;

interface ListDetailAppProps {
  id: string;
}

/** One list: its header, the ordered rows with Move up / Move down, and the dialogs. */
export default function ListDetailApp({ id }: ListDetailAppProps) {
  const router = useRouter();
  const detail = useListDetail(id);
  const online = useOnline();
  const [dialog, setDialog] = useState<"rename" | "add" | "delete" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { list, busy } = detail;

  const dismiss = useCallback(() => setNotice(null), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  async function move(index: number, delta: -1 | 1) {
    const item = list?.items[index];
    if (list === null || item === undefined || busy) return;
    const total = list.items.length;
    const result = await detail.move(index, delta);
    if (result === null) return;
    if (!result.ok) {
      setNotice({ text: failureMessage(result.failure) });
      document.getElementById(moveButtonId(item.id, delta))?.focus();
      return;
    }
    const position = index + delta;
    setNotice({
      text: copy.item.moved
        .replace("{title}", item.title)
        .replace("{pos}", String(position + 1))
        .replace("{total}", String(total)),
    });
    // The row changed place in the DOM, which can drop focus; put it back on the same direction,
    // or on the other one when this move reached an end and that button is now disabled.
    const atEnd = delta === -1 ? position === 0 : position === total - 1;
    const opposite = delta === -1 ? 1 : -1;
    const next = atEnd ? opposite : delta;
    document.getElementById(moveButtonId(item.id, next))?.focus();
  }

  async function remove(item: ListItem) {
    if (busy) return;
    const result = await detail.remove(item);
    setNotice({
      text: result.ok
        ? copy.item.removed.replace("{title}", item.title)
        : failureMessage(result.failure),
    });
  }

  function renamed(name: string) {
    setDialog(null);
    setNotice({ text: copy.form.saved.replace("{name}", name) });
  }

  if (detail.loading) {
    return (
      <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-4 py-8 lg:py-10")}>
        <div aria-live="polite" role="status">
          <p className="sr-only">{copy.detail.loading}</p>
          <div aria-hidden="true" className="flex flex-col">
            {SKELETON_ROWS.map((key) => (
              <div
                className="h-[58px] animate-pulse border-line border-b bg-surface/60 motion-reduce:animate-none"
                key={key}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (list === null) {
    const failure = detail.failure ?? { status: 0, code: "", message: "", retryAfterSec: null };
    const missing = failure.status === 404;
    return (
      <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-4 py-8 lg:py-10")}>
        <div className={cn(CARD_CLASS, "flex flex-col items-start gap-3 p-5")} role="alert">
          <h1 className="font-medium text-[16px] text-ink">
            {missing ? copy.detail.notFound.title : copy.error.title}
          </h1>
          <p className="text-[13px] text-muted">
            {missing ? copy.detail.notFound.body : failureMessage(failure)}
          </p>
          {missing ? (
            <Link className={LOG_SECONDARY_CLASS} href="/lists">
              {copy.back}
            </Link>
          ) : (
            <button className={LOG_SECONDARY_CLASS} onClick={detail.reload} type="button">
              {copy.retry}
            </button>
          )}
        </div>
      </main>
    );
  }

  const total = list.items.length;
  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-4 py-8 lg:py-10")}>
      <ListHeader
        list={list}
        onAdd={() => setDialog("add")}
        onDelete={() => setDialog("delete")}
        onRename={() => setDialog("rename")}
      />

      <OfflineNote online={online} />
      <NoticeBar notice={notice} onDismiss={dismiss} />

      {total === 0 ? (
        <div className={cn(CARD_CLASS, "flex flex-col items-start gap-3 p-5")}>
          <h2 className="font-medium text-[16px] text-ink">{copy.detail.emptyTitle}</h2>
          <p className="max-w-prose text-[13px] text-muted">{copy.detail.emptyBody}</p>
          <button className={LOG_PRIMARY_CLASS} onClick={() => setDialog("add")} type="button">
            {copy.detail.add}
          </button>
        </div>
      ) : (
        <ol aria-label={copy.detail.itemsLabel} className="flex flex-col">
          {list.items.map((item, index) => (
            <ListItemRow
              busy={busy}
              index={index}
              item={item}
              key={item.id}
              onMove={move}
              onRemove={remove}
              total={total}
            />
          ))}
        </ol>
      )}

      <ListFormDialog
        initial={{ name: list.name, description: list.description, kinds: list.kinds }}
        onClose={closeDialog}
        onDone={renamed}
        onSubmit={detail.rename}
        open={dialog === "rename"}
      />
      <ListAddDialog
        name={list.name}
        onAdd={detail.add}
        onClose={closeDialog}
        open={dialog === "add"}
      />
      <DeleteListDialog
        name={list.name}
        onClose={closeDialog}
        onConfirm={detail.destroy}
        onDeleted={() => router.push("/lists")}
        open={dialog === "delete"}
      />
    </main>
  );
}
