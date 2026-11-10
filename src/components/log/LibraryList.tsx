import EntryListRow from "@/components/log/EntryListRow";
import type { Entry } from "@/types/log/entry";

interface LibraryListProps {
  items: readonly Entry[];
  onOpen: (entry: Entry) => void;
}

/** The vertical list with a thumbnail per row. */
export default function LibraryList({ items, onOpen }: LibraryListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((entry) => (
        <li key={entry.id}>
          <EntryListRow entry={entry} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
