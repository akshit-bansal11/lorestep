"use client";

import { useEffect, useState } from "react";

import { fetchAuthProviders } from "@/lib/auth/fetch-auth-providers";
import type { AuthProviders } from "@/types/auth/auth-form";

export interface UseAuthProviders {
  /** False until the answer arrives; `providers` is null before that and when it failed. */
  ready: boolean;
  providers: AuthProviders | null;
}

export function useAuthProviders(): UseAuthProviders {
  const [state, setState] = useState<UseAuthProviders>({ ready: false, providers: null });

  useEffect(() => {
    let cancelled = false;
    fetchAuthProviders().then((providers) => {
      if (!cancelled) setState({ ready: true, providers });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
