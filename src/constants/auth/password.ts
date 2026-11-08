/**
 * Argon2id parameters (SECURITY-SPEC SEC-05: 64 MiB, t=3, p=1). Never lowered for tests: a test
 * runs fewer hashes instead.
 */
export const ARGON2_MEMORY_KIB = 65_536;
export const ARGON2_PASSES = 3;
export const ARGON2_PARALLELISM = 1;
export const ARGON2_TAG_BYTES = 32;
export const ARGON2_SALT_BYTES = 16;

/** NIST SP 800-63B-4 via SEC-06: 15 minimum where the password is the only factor. */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;
