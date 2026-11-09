import {
  ACCOUNT_BODY_CLASS,
  ACCOUNT_HEADING_CLASS,
  ACCOUNT_SECTION_CLASS,
} from "@/constants/account/classes";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import { LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { cn } from "@/utils/cn";

const copy = ACCOUNT_COPY.export;

/** A plain download link: the browser sends the session cookie and saves the attachment. */
export default function ExportButton() {
  return (
    <section aria-labelledby="account-export" className={ACCOUNT_SECTION_CLASS}>
      <h2 className={ACCOUNT_HEADING_CLASS} id="account-export">
        {copy.title}
      </h2>
      <p className={ACCOUNT_BODY_CLASS}>{copy.body}</p>
      <a className={cn(LOG_SECONDARY_CLASS, "self-start")} download href="/api/v1/account/export">
        {copy.action}
      </a>
    </section>
  );
}
