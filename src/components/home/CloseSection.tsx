import Link from "next/link";

import { ACTION_CLASS, DISPLAY_CLASS, PAGE_CLASS, SECTION_GAP_CLASS } from "@/constants/canon/ui";
import { CLOSE_ACTION, CLOSE_LEDE, CLOSE_TITLE } from "@/constants/home/sections";

export default function CloseSection() {
  return (
    <section aria-labelledby="close-title" className={SECTION_GAP_CLASS}>
      <div className={PAGE_CLASS}>
        <div className="grid items-end gap-8 rounded-[36px] bg-accent p-6 text-accent-ink sm:p-10 lg:grid-cols-[7fr_5fr] lg:p-24">
          <h2
            id="close-title"
            className={`${DISPLAY_CLASS} max-w-[16ch] text-[clamp(2.5rem,5.6vw,6.5rem)]`}
          >
            {CLOSE_TITLE}
          </h2>
          <div>
            <p className="max-w-[32ch] text-[18px] leading-relaxed lg:text-[20px]">{CLOSE_LEDE}</p>
            <Link
              href={CLOSE_ACTION.href}
              className={`${ACTION_CLASS} mt-8 bg-accent-ink text-accent hover:brightness-125`}
            >
              {CLOSE_ACTION.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
