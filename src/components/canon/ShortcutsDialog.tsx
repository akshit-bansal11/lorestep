"use client";

import { useEffect, useRef } from "react";
import Backdrop from "@/components/canon/Backdrop";
import HotkeyList from "@/components/canon/HotkeyList";
import { CONTROL_CLASS } from "@/constants/canon/ui";
import { cn } from "@/utils/cn";

interface ShortcutsDialogProps {
  onClose: () => void;
}

export default function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop label="Close the shortcut list" onClose={onClose} />

      <div
        aria-label="Keyboard shortcuts"
        aria-modal="true"
        className={cn(
          "anim-lift relative w-full max-w-sm rounded-overlay border border-edge",
          "bg-canvas p-4 shadow-[var(--tone-cast)]",
        )}
        role="dialog"
      >
        <h2 className="mb-3 font-medium text-[14px] text-ink">Keyboard shortcuts</h2>

        <HotkeyList />

        <button
          className={cn(CONTROL_CLASS, "mt-4 w-full")}
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}
