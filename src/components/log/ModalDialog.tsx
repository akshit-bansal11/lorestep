"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/utils/cn";

interface ModalDialogProps {
  open: boolean;
  title: string;
  /** Fired when the dialog closes, including by Escape. Idempotent: it may fire after `open` is already false. */
  onClose: () => void;
  /** A side panel, or a centred box. */
  variant: "drawer" | "centre";
  /** Where focus lands on open: the heading, or the first text field when the dialog is a search. */
  initialFocus: "heading" | "field";
  children: ReactNode;
}

/**
 * A native modal `<dialog>` (UI-10): the browser supplies the top layer, the inert background,
 * Escape and focus return. Initial focus goes to the heading (UI-D09), since the first control in
 * these dialogs can be a destructive one. The element stays mounted so `close()` can return focus;
 * its contents mount only while open.
 */
export default function ModalDialog({
  open,
  title,
  onClose,
  variant,
  initialFocus,
  children,
}: ModalDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
      if (initialFocus === "field") element.querySelector("input")?.focus();
      else heading.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open, initialFocus]);

  return (
    <dialog
      aria-labelledby={headingId}
      className={cn(
        "max-h-dvh overflow-y-auto border-edge bg-canvas p-0 text-ink backdrop:bg-[var(--tone-veil)]",
        variant === "drawer"
          ? "m-0 mr-0 ml-auto h-dvh w-full max-w-md border-l"
          : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-overlay border shadow-[var(--tone-cast)]",
      )}
      onClose={onClose}
      ref={dialog}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5">
          <h2
            className="font-medium text-[16px] text-ink tracking-[-0.01em]"
            id={headingId}
            ref={heading}
            tabIndex={-1}
          >
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
