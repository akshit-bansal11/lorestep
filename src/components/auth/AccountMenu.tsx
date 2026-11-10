"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/auth/Avatar";
import { AUTH_MENU_ITEM_CLASS } from "@/constants/auth/classes";
import { AUTH_COPY } from "@/constants/auth/copy";
import { CONTROL_CLASS } from "@/constants/canon/ui";
import { useSession } from "@/hooks/auth/use-session";
import { callAuth } from "@/lib/auth/auth-call";
import { authClient } from "@/lib/auth/auth-client";
import { failureMessage } from "@/utils/auth/auth-failure";
import { cn } from "@/utils/cn";

const copy = AUTH_COPY.menu;

const MENU_LINKS = [
  { href: "/library", label: copy.library },
  { href: "/lists", label: copy.lists },
  { href: "/account", label: copy.account },
] as const;

/**
 * The header's account control. Signed out it is a "Sign in" link; signed in it is a disclosure
 * (a button that shows or hides a short list, not an ARIA menu, so no arrow-key contract is
 * promised). The session comes from the client so the header itself stays static.
 */
export default function AccountMenu() {
  const router = useRouter();
  const { user, pending } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    setError(null);
    const failure = await callAuth((options) => authClient.signOut({ fetchOptions: options }));
    setSigningOut(false);
    if (failure !== null) {
      setError(failureMessage(failure, "social"));
      return;
    }
    setOpen(false);
    router.replace("/");
  }

  if (pending) {
    return (
      <span aria-hidden="true" className={cn(CONTROL_CLASS, "inline-block w-16 opacity-60")} />
    );
  }

  if (user === null) {
    return (
      <Link className={cn(CONTROL_CLASS, "inline-flex items-center")} href="/sign-in">
        {copy.signIn}
      </Link>
    );
  }

  return (
    <div className="relative" ref={root}>
      <button
        aria-controls="account-menu"
        aria-expanded={open}
        aria-label={copy.open}
        className={cn(CONTROL_CLASS, "inline-flex items-center gap-1.5 pr-2 pl-1")}
        onClick={() => setOpen((value) => !value)}
        ref={trigger}
        type="button"
      >
        <Avatar user={user} />
        <svg
          aria-hidden="true"
          className="size-3 text-muted"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 z-40 mt-1.5 w-60 rounded-overlay bg-surface p-1 shadow-[var(--tone-cast)]"
          id="account-menu"
        >
          <p className="truncate px-2.5 py-2 text-[12px] text-muted">
            {copy.signedInAs} <span className="text-ink">{user.email}</span>
          </p>
          {MENU_LINKS.map((link) => (
            <Link
              className={AUTH_MENU_ITEM_CLASS}
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            className={AUTH_MENU_ITEM_CLASS}
            disabled={signingOut}
            onClick={signOut}
            type="button"
          >
            {signingOut ? copy.signingOut : copy.signOut}
          </button>
          <div role="alert">
            {error !== null && <p className="px-2.5 py-2 text-[12px] text-danger">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
