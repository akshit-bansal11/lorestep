/**
 * NIST SP 800-63B-4 via SEC-06: 15 minimum where the password is the only factor. Client-side
 * advisory only: Neon Auth enforces its own, undocumented policy (PLAN.md section 12.2).
 */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;
