"use client";

import { authClient } from "@/lib/auth/auth-client";
import type { SessionUser } from "@/types/auth/auth-form";

export interface UseSession {
  user: SessionUser | null;
  /** True until the first answer, so the header holds its place rather than flash "Sign in". */
  pending: boolean;
}

export function useSession(): UseSession {
  const { data, isPending } = authClient.useSession();
  return {
    user:
      data === null
        ? null
        : { name: data.user.name, email: data.user.email, image: data.user.image ?? null },
    pending: isPending,
  };
}
