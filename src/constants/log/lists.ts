/** Caps; name and description mirror the `lists` CHECK constraints (DB-24). D-19, PLAN.md section 4. */
export const LIST_LIMITS = {
  /** Live lists per user. */
  perUser: 50,
  name: 80,
  description: 500,
  /** Items per list; not in the plan, a backstop so one list cannot grow without bound. */
  itemsPerList: 500,
  /** PLAN.md section 5: every JSON body. */
  bodyBytes: 64 * 1024,
} as const;
