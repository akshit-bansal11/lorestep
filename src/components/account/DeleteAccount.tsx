"use client";

import { type FormEvent, useState } from "react";
import {
  ACCOUNT_BODY_CLASS,
  ACCOUNT_HEADING_CLASS,
  ACCOUNT_SECTION_CLASS,
} from "@/constants/account/classes";
import { ACCOUNT_COPY } from "@/constants/account/copy";
import { LOG_CONTROL_CLASS, LOG_DANGER_CLASS, LOG_LABEL_CLASS } from "@/constants/log/classes";
import { eraseAccount } from "@/lib/api/account-client";
import { cn } from "@/utils/cn";
import { failureMessage } from "@/utils/log/failure-message";

const copy = ACCOUNT_COPY.erase;

interface DeleteAccountProps {
  email: string;
}

/**
 * The one irreversible action, so it asks for the account's email typed out (UX-05) and names
 * what goes (UX-24). The button stays disabled until the text matches; the server checks again.
 * On success the page reloads at `/`, where the deleted session no longer signs anyone in.
 */
export default function DeleteAccount({ email }: DeleteAccountProps) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    setPending(true);
    setError(null);
    const result = await eraseAccount(typed.trim());
    if (result.ok) {
      window.location.assign("/");
      return;
    }
    setPending(false);
    setError(failureMessage(result.failure));
  }

  return (
    <section aria-labelledby="account-erase" className={ACCOUNT_SECTION_CLASS}>
      <h2 className={ACCOUNT_HEADING_CLASS} id="account-erase">
        {copy.title}
      </h2>
      <p className={ACCOUNT_BODY_CLASS}>{copy.body}</p>
      <form className="flex flex-col gap-3" noValidate onSubmit={onSubmit}>
        <label className={LOG_LABEL_CLASS}>
          {copy.label.replace("{email}", email)}
          <input
            autoCapitalize="off"
            autoComplete="off"
            className={cn(LOG_CONTROL_CLASS, "w-full max-w-md")}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            type="text"
            value={typed}
          />
        </label>
        <div role="alert">
          {error !== null && <p className="text-[13px] text-danger">{error}</p>}
        </div>
        <button
          className={cn(LOG_DANGER_CLASS, "self-start")}
          disabled={!matches || pending}
          type="submit"
        >
          {pending ? copy.pending : copy.submit}
        </button>
      </form>
    </section>
  );
}
