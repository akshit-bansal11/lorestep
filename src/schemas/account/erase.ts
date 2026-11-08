import { z } from "zod";

/** Body of DELETE /api/v1/account: the account's email, typed by the user (UX-05). */
export const eraseSchema = z.strictObject({
  confirm: z.string().trim().min(1).max(254),
});
