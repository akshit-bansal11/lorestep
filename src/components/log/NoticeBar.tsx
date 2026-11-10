"use client";

import { useEffect, useRef } from "react";
import { LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { LIBRARY_COPY } from "@/constants/log/copy";
import { UNDO_WINDOW_SEC } from "@/constants/log/library";
import type { Notice } from "@/types/log/library";

interface NoticeBarProps {
  notice: Notice | null;
  onDismiss: () => void;
}

/**
 * The one status line: what just happened and, after a delete, the Undo. It sits in the page flow
 * (never over content, so it cannot hide a focused control), and its live region is always in the
 * DOM so a new message is announced. Focus moves to Undo when it appears, because the control that
 * triggered the delete is gone.
 */
export default function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  const undo = useRef<HTMLButtonElement>(null);
  const onUndo = notice?.onUndo;

  useEffect(() => {
    if (onUndo === undefined) return;
    undo.current?.focus();
    const timer = setTimeout(onDismiss, UNDO_WINDOW_SEC * 1000);
    return () => clearTimeout(timer);
  }, [onUndo, onDismiss]);

  return (
    <div aria-live="polite" role="status">
      {notice !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-raise px-4 py-2">
          <p className="min-w-0 flex-1 text-[13px] text-ink">{notice.text}</p>
          {notice.onUndo !== undefined && (
            <button
              className={LOG_SECONDARY_CLASS}
              onClick={notice.onUndo}
              ref={undo}
              type="button"
            >
              {LIBRARY_COPY.remove.undo}
            </button>
          )}
          <button className={LOG_SECONDARY_CLASS} onClick={onDismiss} type="button">
            {LIBRARY_COPY.remove.dismiss}
          </button>
        </div>
      )}
    </div>
  );
}
