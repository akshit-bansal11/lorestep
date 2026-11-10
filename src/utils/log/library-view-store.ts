import { LIBRARY_VIEW_STORAGE_KEY } from "@/constants/canon/storage";
import { DEFAULT_LIBRARY_VIEW, LIBRARY_VIEWS } from "@/constants/log/library";
import type { LibraryView } from "@/types/log/library";
import { pick } from "@/utils/log/pick";

const IDS = LIBRARY_VIEWS.map((view) => view.id);
const listeners = new Set<() => void>();

/** The stored layout, or the default when nothing valid is stored or storage is blocked. */
export function getLibraryViewSnapshot(): LibraryView {
  try {
    return pick(IDS, localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY) ?? "") ?? DEFAULT_LIBRARY_VIEW;
  } catch {
    return DEFAULT_LIBRARY_VIEW;
  }
}

export function getServerLibraryViewSnapshot(): LibraryView {
  return DEFAULT_LIBRARY_VIEW;
}

export function subscribeLibraryView(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setLibraryView(view: LibraryView): void {
  try {
    localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, view);
  } catch (error) {
    console.warn("library view write failed", error);
  }
  for (const listener of listeners) listener();
}
