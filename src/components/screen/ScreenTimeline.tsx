import { NUM_CLASS, SECTION_TITLE_CLASS } from "@/constants/canon/ui";
import type { ScreenEntry, ScreenFranchise, ScreenGroup } from "@/types/canon/screen";
import { cn } from "@/utils/cn";

const TYPE_LABEL: Record<string, string> = {
  tv: "series",
  movie: "film",
  animated: "animated",
  special: "special",
  ova: "ova",
};

function Meta({ entry }: { entry: ScreenEntry }) {
  const bits: string[] = [];
  if (entry.type !== null) bits.push(TYPE_LABEL[entry.type] ?? entry.type);
  if (entry.year !== null) bits.push(String(entry.year));
  if (entry.chronologicalYear !== null) bits.push(entry.chronologicalYear);
  if (entry.seasons !== null) bits.push(`${entry.seasons} seasons`);
  if (entry.episodes !== null) bits.push(`${entry.episodes} ep`);
  if (entry.tag !== null) bits.push(entry.tag);

  if (bits.length === 0) return null;

  return (
    <span className={cn(NUM_CLASS, "flex flex-wrap items-center gap-x-2 text-[10px] text-faint")}>
      {bits.map((bit, index) => (
        <span className="flex items-center gap-2" key={bit}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span>{bit}</span>
        </span>
      ))}
    </span>
  );
}

function Row({ entry, position }: { entry: ScreenEntry; position: number }) {
  // A marker is not a thing to watch — it explains where a run of episodes sits
  // against the films around it. Rendering it as another numbered title would
  // claim it is watchable and throw the count off.
  if (entry.kind === "marker") {
    return (
      <li className="flex gap-3 py-1.5 pl-11">
        <span className="text-[11px] text-faint italic leading-relaxed">↳ {entry.name}</span>
      </li>
    );
  }

  return (
    <li className="group flex gap-3 rounded-card py-2 pr-2 transition-colors duration-[160ms] hover:bg-surface motion-reduce:transition-none">
      <span
        className={cn(
          NUM_CLASS,
          "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-[10px] text-faint",
          "transition-colors duration-[160ms] group-hover:border-accent group-hover:text-accent motion-reduce:transition-none",
        )}
      >
        {position}
      </span>
      {/* Title and details on the left, the note beside them from lg up, so a
          wide screen spreads each row across instead of leaving it empty. */}
      <span className="grid flex-1 grid-cols-1 gap-1 pt-1 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-x-10 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <span className="flex flex-col gap-1">
          <span className="text-[13px] text-ink leading-tight lg:text-[14px]">{entry.name}</span>
          <Meta entry={entry} />
        </span>
        {entry.note === "" ? null : (
          <span className="max-w-prose text-[11px] text-muted leading-relaxed lg:text-[12px]">
            {entry.note}
          </span>
        )}
      </span>
    </li>
  );
}

interface ScreenTimelineProps {
  franchise: ScreenFranchise;
}

export default function ScreenTimeline({ franchise }: ScreenTimelineProps) {
  const ordered = [...franchise.entries].sort((left, right) => left.order - right.order);

  // Ungrouped chronologies (the MCU watch order is one flat run) get a single
  // nameless block rather than a special-cased branch further down.
  const blocks: { group: ScreenGroup | null; entries: ScreenEntry[] }[] = [];
  for (const entry of ordered) {
    const group = franchise.groups.find((item) => item.id === entry.group) ?? null;
    const last = blocks.at(-1);
    if (last !== undefined && last.group?.id === group?.id) last.entries.push(entry);
    else blocks.push({ group, entries: [entry] });
  }

  let position = 0;

  return (
    <div className="flex flex-col gap-7">
      {blocks.map((block) => (
        <section className="flex flex-col gap-2" key={block.group?.id ?? "ungrouped"}>
          {block.group === null ? null : (
            <header className="flex flex-col gap-1">
              <h2 className={SECTION_TITLE_CLASS}>{block.group.name}</h2>
              {block.group.blurb === "" ? null : (
                <p className="max-w-prose text-[11px] text-muted leading-relaxed">
                  {block.group.blurb}
                </p>
              )}
            </header>
          )}
          {/* The rail runs through the centre of the numbered stops. */}
          <ol className="relative m-0 flex list-none flex-col p-0 before:absolute before:top-3 before:bottom-3 before:left-[13.5px] before:w-px before:bg-line">
            {block.entries.map((entry) => {
              if (entry.kind === "title") position += 1;
              return <Row entry={entry} key={entry.id} position={position} />;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
