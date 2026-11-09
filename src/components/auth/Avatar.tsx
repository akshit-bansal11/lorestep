"use client";

import Image from "next/image";
import { useState } from "react";
import type { SessionUser } from "@/types/auth/auth-form";
import { initials } from "@/utils/auth/initials";

interface AvatarProps {
  user: SessionUser;
}

/** The account's picture when it has one and it loads, else the initials on the accent wash. */
export default function Avatar({ user }: AvatarProps) {
  const [broken, setBroken] = useState(false);

  if (user.image !== null && !broken) {
    return (
      <Image
        alt={`${user.name}'s avatar`}
        className="size-5 rounded-full object-cover"
        height={20}
        onError={() => setBroken(true)}
        // Provider-hosted image of unknown origin: not routed through the optimizer.
        src={user.image}
        unoptimized
        width={20}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 items-center justify-center rounded-full border border-accent-line bg-accent-soft font-medium text-[9px] text-ink"
    >
      {initials(user.name, user.email)}
    </span>
  );
}
