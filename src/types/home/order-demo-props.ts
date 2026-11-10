import type { DemoFranchise } from "@/types/home/order-demo";

export type DemoOrder = "story" | "release";

export interface OrderDemoProps {
  /** Built by `buildDemo`; rows in story order. */
  franchises: DemoFranchise[];
  className?: string;
}
