"use client";

import { type FormEvent, useState } from "react";

import type { AuthContext, AuthFailure, FieldErrors } from "@/types/auth/auth-form";
import { failureMessage } from "@/utils/auth/auth-failure";

interface UseAuthFormOptions {
  context: AuthContext;
  validate: (data: FormData) => FieldErrors;
  /** Resolves to null on success, else how it failed. */
  request: (data: FormData) => Promise<AuthFailure | null>;
  /** Runs once, after a successful request. */
  onDone: () => void;
}

export interface UseAuthForm {
  pending: boolean;
  done: boolean;
  errors: FieldErrors;
  formError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Submit flow shared by every auth form: validate on the client, move focus to the first invalid
 * field, send, and keep the button disabled from submit until the page navigates away. A server
 * failure is one sentence in `formError`; it never says which of email or password was wrong.
 */
export function useAuthForm({
  context,
  validate,
  request,
  onDone,
}: UseAuthFormOptions): UseAuthForm {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || done) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const found = validate(data);
    setErrors(found);
    setFormError(null);

    const first = Object.keys(found)[0];
    if (first !== undefined) {
      const control = form.elements.namedItem(first);
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setPending(true);
    request(data).then((failure) => {
      setPending(false);
      if (failure === null) {
        setDone(true);
        onDone();
      } else {
        setFormError(failureMessage(failure, context));
      }
    });
  }

  return { pending, done, errors, formError, onSubmit };
}
