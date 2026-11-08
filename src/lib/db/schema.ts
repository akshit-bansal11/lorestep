import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type {
  Arc,
  Edition,
  GameAuthored,
  GameIgdb,
  GameMarket,
  GameSources,
  StoreKind,
  Tier,
} from "@/types/canon/canon";
import type { ScreenEntry, ScreenGroup } from "@/types/canon/screen";

/**
 * Canon data in Neon Postgres — 126 franchises, 690 games, 6 screen chronologies.
 *
 * Column types mirror `src/types/canon/canon.ts` through `$type<T>()`, so the
 * database and the app agree by construction and a read needs no mapping layer.
 * The `Game` and `Franchise` interfaces are the contract every component is
 * written against, so a store matching them keeps a change of database confined
 * to the loader — which is what made swapping one out cheap.
 *
 * The composite sub-objects — editions, market, igdb, sources, arcs, and the
 * screen groups and entries — stay as `jsonb` rather than being normalised into
 * their own tables. They are read and written whole, never queried across, and
 * never joined on. Six more tables would buy nothing but joins.
 *
 * `order` is a reserved word in SQL, so the columns are named `sort_order` and
 * mapped back to `order` in TypeScript. The alternative is quoting the
 * identifier in every hand-written statement, which works right up until the
 * one place someone forgets.
 */

export const franchises = pgTable(
  "franchises",
  {
    id: text("id").primaryKey(),
    order: integer("sort_order").notNull(),
    name: text("name").notNull(),
    scope: text("scope").notNull(),
    caveat: text("caveat").notNull(),
    /** Present only where a franchise splits into storylines that stand alone. */
    arcs: jsonb("arcs").$type<Arc[]>(),
  },
  (table) => [index("franchises_order_idx").on(table.order)],
);

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    franchiseId: text("franchise_id")
      .notNull()
      .references(() => franchises.id, { onDelete: "cascade" }),
    order: integer("sort_order").notNull(),
    /** Matches an `arcs[].id` on the parent franchise, where it has arcs. */
    arc: text("arc"),
    title: text("title").notNull(),
    year: integer("year").notNull(),
    version: text("version").notNull(),
    platform: text("platform").notNull(),
    msrp: text("msrp").notNull(),
    /** Double rather than integer: playtimes are not whole hours. */
    hours: doublePrecision("hours"),
    tier: text("tier").$type<Tier>().notNull(),
    starter: boolean("starter").notNull(),
    store: text("store").$type<StoreKind>().notNull(),
    query: text("query").notNull(),
    storefront: text("storefront").notNull(),
    note: text("note").notNull(),
    editions: jsonb("editions").$type<Edition[]>().notNull(),
    sources: jsonb("sources").$type<GameSources>(),
    market: jsonb("market").$type<GameMarket>(),
    igdb: jsonb("igdb").$type<GameIgdb>(),
    authored: jsonb("authored").$type<GameAuthored>(),
  },
  // Compound, so a franchise's games come back already in story order rather
  // than sorting 690 rows to find the dozen that were wanted.
  (table) => [index("games_franchise_order_idx").on(table.franchiseId, table.order)],
);

/**
 * Movies and series chronologies. Entries are nested rather than split into
 * their own table: 339 across six rows, read whole, never queried across.
 */
export const screenFranchises = pgTable(
  "screen_franchises",
  {
    id: text("id").primaryKey(),
    order: integer("sort_order").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    /** Which merge source it came from. The two disagree about scope, and a
     *  reader deserves to know which chronology they are looking at. */
    source: text("source").notNull(),
    groups: jsonb("groups").$type<ScreenGroup[]>().notNull(),
    entries: jsonb("entries").$type<ScreenEntry[]>().notNull(),
  },
  (table) => [index("screen_franchises_order_idx").on(table.order)],
);

/**
 * Auth and limiter tables, created by `db/migrations/0001_auth_tables.sql` and mirrored here
 * column for column. Shapes follow the Better-Auth docs (core schema, `deviceAuthorization`,
 * database rate-limit storage); tables are renamed through `modelName` and the property names are
 * Better-Auth's field names, so the Drizzle adapter maps them without a `fields` override.
 * Every column carries its DB-14 classification.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    /** @classification neither */
    id: text("id").primaryKey(),
    /** @classification personal */
    name: text("name").notNull(),
    /** @classification personal */
    email: text("email").notNull().unique("users_email_key"),
    /** @classification neither */
    emailVerified: boolean("email_verified").notNull().default(false),
    /** @classification personal — provider avatar URL, https only. */
    image: text("image"),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [
    check("users_image_https", sql`${table.image} IS NULL OR ${table.image} LIKE 'https://%'`),
    check("users_image_length", sql`char_length(${table.image}) <= 500`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** @classification neither */
    id: text("id").primaryKey(),
    /** @classification credential — stored raw by Better-Auth (OPEN_ITEMS.md, R1). */
    token: text("token").notNull().unique("sessions_token_key"),
    /** @classification neither */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** @classification personal */
    ipAddress: text("ip_address"),
    /** @classification personal */
    userAgent: text("user_agent"),
    /** @classification personal — owner id. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    /** @classification neither */
    id: text("id").primaryKey(),
    /** @classification personal — provider-side identity. */
    accountId: text("account_id").notNull(),
    /** @classification neither */
    providerId: text("provider_id").notNull(),
    /** @classification personal — owner id. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** @classification credential */
    accessToken: text("access_token"),
    /** @classification credential */
    refreshToken: text("refresh_token"),
    /** @classification credential */
    idToken: text("id_token"),
    /** @classification neither */
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    /** @classification neither */
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    /** @classification neither */
    scope: text("scope"),
    /** @classification credential — Argon2id hash. */
    password: text("password"),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    /** @classification neither */
    id: text("id").primaryKey(),
    /** @classification credential — token or OTP key. */
    identifier: text("identifier").notNull(),
    /** @classification credential */
    value: text("value").notNull(),
    /** @classification neither */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const deviceCodes = pgTable(
  "device_codes",
  {
    /** @classification neither */
    id: text("id").primaryKey(),
    /** @classification credential */
    deviceCode: text("device_code").notNull().unique("device_codes_device_code_key"),
    /** @classification credential */
    userCode: text("user_code").notNull().unique("device_codes_user_code_key"),
    /** @classification personal — set on approval. The FK is ours, not the plugin's (DB-11). */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** @classification neither */
    clientId: text("client_id"),
    /** @classification neither */
    scope: text("scope"),
    /** @classification neither — pending, approved or denied. */
    status: text("status").notNull(),
    /** @classification neither */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** @classification neither */
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    /** @classification neither */
    pollingInterval: integer("polling_interval"),
  },
  (table) => [
    check(
      "device_codes_code_length",
      sql`char_length(${table.deviceCode}) <= 191 AND char_length(${table.userCode}) <= 191`,
    ),
  ],
);

/** Better-Auth's own limiter (`rateLimit.storage = "database"`). */
export const authRateLimits = pgTable("auth_rate_limits", {
  /** @classification neither */
  id: text("id").primaryKey(),
  /** @classification personal — client IP plus path. */
  key: text("key").notNull().unique("auth_rate_limits_key_key"),
  /** @classification neither */
  count: integer("count").notNull(),
  /** @classification neither — epoch ms. */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** The app's fixed-window limiter, one atomic upsert per request (PLAN.md D-11). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    /** @classification personal — user id or client IP. */
    bucket: text("bucket").notNull(),
    /** @classification neither — epoch seconds. */
    windowStart: bigint("window_start", { mode: "number" }).notNull(),
    /** @classification neither */
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ name: "rate_limits_pkey", columns: [table.bucket, table.windowStart] }),
    index("rate_limits_window_start_idx").on(table.windowStart),
  ],
);
