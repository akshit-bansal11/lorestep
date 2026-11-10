"use client";

import { useCallback, useState } from "react";
import ListFormDialog from "@/components/log/ListFormDialog";
import ListGrid from "@/components/log/ListGrid";
import NoticeBar from "@/components/log/NoticeBar";
import OfflineNote from "@/components/log/OfflineNote";
import { PAGE_CLASS, APP_TITLE_CLASS } from "@/constants/canon/ui";
import { LOG_PRIMARY_CLASS } from "@/constants/log/classes";
import { LIST_LIMITS } from "@/constants/log/lists";
import { LISTS_COPY } from "@/constants/log/lists-copy";
import { useLists } from "@/hooks/log/use-lists";
import { useOnline } from "@/hooks/log/use-online";
import type { Notice } from "@/types/log/library";
import { cn } from "@/utils/cn";

const copy = LISTS_COPY;

/** The signed-in lists overview: a grid of cards and the create dialog. */
export default function ListsApp() {
  const lists = useLists();
  const online = useOnline();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const atCap = lists.lists.length >= LIST_LIMITS.perUser;

  const dismiss = useCallback(() => setNotice(null), []);
  const closeForm = useCallback(() => setCreating(false), []);

  function created(name: string) {
    setCreating(false);
    setNotice({ text: copy.form.created.replace("{name}", name) });
  }

  return (
    <main className={cn(PAGE_CLASS, "flex flex-1 flex-col gap-4 py-8 lg:py-10")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={APP_TITLE_CLASS}>{copy.title}</h1>
        <button
          className={LOG_PRIMARY_CLASS}
          disabled={lists.loading || atCap}
          onClick={() => setCreating(true)}
          type="button"
        >
          {copy.newList}
        </button>
      </div>

      {atCap && (
        <p className="text-[13px] text-muted">
          {copy.capReached.replace("{max}", String(LIST_LIMITS.perUser))}
        </p>
      )}

      <OfflineNote online={online} />
      <NoticeBar notice={notice} onDismiss={dismiss} />

      <ListGrid
        failure={lists.failure}
        lists={lists.lists}
        loading={lists.loading}
        onNew={() => setCreating(true)}
        onRetry={lists.reload}
      />

      <ListFormDialog
        initial={null}
        onClose={closeForm}
        onDone={created}
        onSubmit={lists.create}
        open={creating}
      />
    </main>
  );
}
