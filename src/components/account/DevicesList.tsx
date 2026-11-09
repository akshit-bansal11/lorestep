"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ACCOUNT_BODY_CLASS,
  ACCOUNT_HEADING_CLASS,
  ACCOUNT_SECTION_CLASS,
} from "@/constants/account/classes";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import { LOG_SECONDARY_CLASS } from "@/constants/log/classes";
import { revokeDeviceSession } from "@/lib/api/account-client";
import type { DeviceSession } from "@/types/account/account";
import { formatDay } from "@/utils/account/format-day";
import { failureMessage } from "@/utils/log/failure-message";

const copy = ACCOUNT_COPY.devices;

interface DevicesListProps {
  devices: DeviceSession[];
  currentId: string;
}

/**
 * Every signed-in session with a Sign out per device; the current one is marked instead (the
 * header's Sign out covers it). Signing out is undone by signing in again, so it asks no confirm.
 */
export default function DevicesList({ devices, currentId }: DevicesListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signOut(id: string) {
    setPendingId(id);
    setError(null);
    const result = await revokeDeviceSession(id);
    setPendingId(null);
    if (result.ok) router.refresh();
    else setError(failureMessage(result.failure));
  }

  return (
    <section aria-labelledby="account-devices" className={ACCOUNT_SECTION_CLASS}>
      <h2 className={ACCOUNT_HEADING_CLASS} id="account-devices">
        {copy.title}
      </h2>
      <p className={ACCOUNT_BODY_CLASS}>{copy.body}</p>
      <ul className="flex flex-col divide-y divide-line">
        {devices.map((device) => {
          const name = device.userAgent ?? copy.unknown;
          return (
            <li className="flex flex-wrap items-center gap-3 py-3" key={device.id}>
              <div className="min-w-0 flex-1 basis-60">
                <p className="truncate text-[13px] text-ink" title={name}>
                  {name}
                </p>
                <p className={ACCOUNT_BODY_CLASS}>
                  {copy.signedIn
                    .replace("{created}", formatDay(device.createdAt))
                    .replace("{expires}", formatDay(device.expiresAt))}
                </p>
              </div>
              {device.id === currentId ? (
                <span className={ACCOUNT_BODY_CLASS}>{copy.current}</span>
              ) : (
                <button
                  aria-label={copy.signOutLabel.replace("{device}", name)}
                  className={LOG_SECONDARY_CLASS}
                  disabled={pendingId !== null}
                  onClick={() => signOut(device.id)}
                  type="button"
                >
                  {pendingId === device.id ? copy.signingOut : copy.signOut}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {devices.every((device) => device.id === currentId) && (
        <p className={ACCOUNT_BODY_CLASS}>{copy.none}</p>
      )}
      <div role="alert">{error !== null && <p className="text-[13px] text-ink">{error}</p>}</div>
    </section>
  );
}
