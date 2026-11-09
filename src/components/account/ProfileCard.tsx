import Avatar from "@/components/auth/Avatar";
import {
  ACCOUNT_BODY_CLASS,
  ACCOUNT_HEADING_CLASS,
  ACCOUNT_SECTION_CLASS,
} from "@/constants/account/classes";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import type { SessionUser } from "@/types/auth/auth-form";
import { cn } from "@/utils/cn";

interface ProfileCardProps {
  user: SessionUser;
}

/** Who is signed in. */
export default function ProfileCard({ user }: ProfileCardProps) {
  return (
    <section aria-labelledby="account-profile" className={ACCOUNT_SECTION_CLASS}>
      <h2 className={ACCOUNT_HEADING_CLASS} id="account-profile">
        {ACCOUNT_COPY.profile.title}
      </h2>
      <div className="flex items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-[14px] text-ink">{user.name}</p>
          <p className={cn("truncate", ACCOUNT_BODY_CLASS)}>{user.email}</p>
        </div>
      </div>
    </section>
  );
}
