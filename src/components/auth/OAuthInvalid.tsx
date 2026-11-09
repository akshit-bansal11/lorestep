import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { OAUTH_COPY } from "@/constants/auth/oauth";
import { TEXT_LINK_CLASS } from "@/constants/canon/ui";

/** Both OAuth pages, reached without a usable signed request (bookmarked, edited, truncated). */
export default function OAuthInvalid() {
  return (
    <AuthShell lead={OAUTH_COPY.invalid.lead} title={OAUTH_COPY.invalid.title}>
      <Link className={TEXT_LINK_CLASS} href="/">
        {OAUTH_COPY.invalid.back}
      </Link>
    </AuthShell>
  );
}
