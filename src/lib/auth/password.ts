import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

import {
  ARGON2_MEMORY_KIB,
  ARGON2_PARALLELISM,
  ARGON2_PASSES,
  ARGON2_SALT_BYTES,
  ARGON2_TAG_BYTES,
} from "@/constants/auth/password";
import type { Argon2Cost } from "@/types/auth/auth";

const PHC_PATTERN = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w+/]+)\$([\w+/]+)$/;

const COST: Argon2Cost = {
  memory: ARGON2_MEMORY_KIB,
  passes: ARGON2_PASSES,
  parallelism: ARGON2_PARALLELISM,
  tagLength: ARGON2_TAG_BYTES,
};

function derive(password: string, nonce: Buffer, cost: Argon2Cost) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2("argon2id", { message: password, nonce, ...cost }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

const b64 = (bytes: Buffer) => bytes.toString("base64").replace(/=+$/, "");

/**
 * Argon2id via `node:crypto` (Node 24.7+), stored as a PHC string so the parameters travel with
 * the hash: `$argon2id$v=19$m=65536,t=3,p=1$<salt>$<tag>`. Random salt per call.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(ARGON2_SALT_BYTES);
  const tag = await derive(password, salt, COST);
  const params = `m=${COST.memory},t=${COST.passes},p=${COST.parallelism}`;
  return `$argon2id$v=19$${params}$${b64(salt)}$${b64(tag)}`;
}

/** Constant-time check against a stored PHC string. A malformed hash never verifies. */
export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const match = PHC_PATTERN.exec(hash);
  if (match === null) return false;
  const [, memory, passes, parallelism, salt = "", tag = ""] = match;
  const expected = Buffer.from(tag, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    tagLength: expected.length,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
