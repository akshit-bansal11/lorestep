import type { ReactNode } from "react";

/**
 * A boxed sentence. It carries no live-region role: the caller keeps an always-mounted
 * `role="alert"` (errors) or `role="status"` (progress, success) around it, because a region that
 * is inserted together with its text is announced unreliably.
 */
export default function AuthMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-control border border-accent-line bg-accent-soft px-3 py-2 text-[13px] text-ink">
      {children}
    </p>
  );
}
