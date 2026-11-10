import type { DemoOrder } from "@/types/home/order-demo-props";

/** Height of one demo row in px; rows are placed at `rank * DEMO_ROW_HEIGHT`. */
export const DEMO_ROW_HEIGHT = 54;

export const DEMO_ORDER_OPTIONS: readonly DemoOrder[] = ["story", "release"];

export const DEMO_ORDER_LABEL: Record<DemoOrder, string> = {
  story: "Story order",
  release: "Release order",
};

export const DEMO_STATUS: Record<DemoOrder, string> = {
  story: "Sorted by story order",
  release: "Sorted by release year",
};

export const DEMO_FRANCHISE_GROUP_LABEL = "Franchise";
export const DEMO_ORDER_GROUP_LABEL = "Order";
export const DEMO_FOOT = "Games released in the same year keep their story order.";
/** The franchise `DEMO_NOTE` describes. */
export const DEMO_NOTE_FRANCHISE_ID = "metal-gear";

export const DEMO_TOGGLE_CLASS =
  "h-10 rounded-full px-4 font-semibold text-[15px] text-muted transition-[background-color,color] duration-(--dur-2) ease-out hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink";
