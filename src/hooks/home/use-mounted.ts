"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop(): () => void {
  return () => {};
}

/** False in the server render and on hydration, true once the client has taken over. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
