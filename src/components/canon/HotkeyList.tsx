import { HOTKEYS } from "@/constants/canon/hotkeys";

/** The one rendering of the shortcut table, so the in-app dialog and the docs page cannot disagree. */
export default function HotkeyList() {
  return (
    <dl className="flex flex-col gap-2">
      {HOTKEYS.map((hotkey) => (
        <div className="flex items-baseline gap-3" key={hotkey.keys}>
          <dt className="w-24 shrink-0 font-mono text-[11px] text-ink">{hotkey.keys}</dt>
          <dd className="flex-1 text-[12px] text-muted">{hotkey.does}</dd>
        </div>
      ))}
    </dl>
  );
}
