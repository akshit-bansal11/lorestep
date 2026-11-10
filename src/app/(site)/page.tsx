import type { Metadata } from "next";
import CloseSection from "@/components/home/CloseSection";
import DataSection from "@/components/home/DataSection";
import ExtensionSection from "@/components/home/ExtensionSection";
import FaqSection from "@/components/home/FaqSection";
import FranchiseReel from "@/components/home/FranchiseReel";
import GamesSection from "@/components/home/GamesSection";
import HomeHero from "@/components/home/HomeHero";
import OrderDemo from "@/components/home/OrderDemo";
import ThreeWays from "@/components/home/ThreeWays";
import TrackerSection from "@/components/home/TrackerSection";
import { DEMO_NOTE_FRANCHISE_ID } from "@/constants/home/order-demo";
import { listFranchises, listScreen, sectionCounts } from "@/lib/db/queries";
import { buildDemo } from "@/utils/home/order-demo";
import { reelNames } from "@/utils/home/reel-names";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lorestep — story order for connected franchises",
  description:
    "What to play, watch and read, in in-universe order rather than release order. Games, movies and series, and books.",
};

export default async function Page() {
  const [counts, franchises, screen] = await Promise.all([
    sectionCounts(),
    listFranchises(),
    listScreen(),
  ]);
  const metalGear = franchises.find((franchise) => franchise.id === DEMO_NOTE_FRANCHISE_ID);

  return (
    <main className="flex flex-1 flex-col">
      <HomeHero counts={counts} demo={<OrderDemo franchises={buildDemo(franchises)} />} />
      <FranchiseReel names={reelNames(franchises, screen)} />
      <ThreeWays counts={counts} />
      {metalGear === undefined ? null : <GamesSection franchise={metalGear} />}
      <TrackerSection />
      <ExtensionSection />
      <DataSection />
      <FaqSection />
      <CloseSection />
    </main>
  );
}
