import EntryCard from "@/components/log/EntryCard";
import type { Entry } from "@/types/log/entry";

interface LibraryCardsProps {
  items: readonly Entry[];
  onOpen: (entry: Entry) => void;
}

/** The poster grid: 2 columns on a phone, up to 6 on a wide screen. */
export default function LibraryCards({ items, onOpen }: LibraryCardsProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
      {items.map((entry) => (
        <li className="min-w-0" key={entry.id}>
          <EntryCard entry={entry} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
