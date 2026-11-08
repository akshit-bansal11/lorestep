import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
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
    check("users_name_length", sql`char_length(${table.name}) BETWEEN 1 AND 100`),
    // RFC 5321 path limit.
    check("users_email_length", sql`char_length(${table.email}) <= 254`),
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
    /** @classification personal — display label only, never an authorization input. */
    userAgent: text("user_agent"),
    /** @classification personal — owner id. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** @classification neither — which client holds the session; authorization reads this. */
    client: text("client").notNull().default("browser"),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    check("sessions_client_known", sql`${table.client} IN ('browser', 'dogear')`),
  ],
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

/**
 * Domain tables, created by `db/migrations/0002_log_tables.sql` and mirrored here column for
 * column (PLAN.md section 4; status model in section 3). No FK to the catalog tables. Composite
 * FKs on `(id, user_id)` keep a link or list item from ever crossing owners.
 */

const KINDS_SQL = sql.raw("'movie', 'series', 'anime', 'manga', 'game'");
const EXT_SOURCES_SQL = sql.raw("'tmdb', 'omdb', 'mal', 'igdb'");
const STATUSES_SQL = sql.raw("'planned', 'in_progress', 'completed', 'on_hold', 'dropped'");
const SHELVES_SQL = sql.raw("'own', 'wishlist', 'trash'");
const PLATFORMS_SQL = sql.raw(
  "'netflix', 'primevideo', 'hotstar', 'zee5', 'hbomax', 'crunchyroll'",
);

const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

/** An https URL of at most 500 characters. A CHECK passes on NULL, so the column stays nullable. */
const httpsUrlCheck = (name: string, column: AnyPgColumn) =>
  check(name, sql`${column} LIKE 'https://%' AND char_length(${column}) <= 500`);

export const entries = pgTable(
  "entries",
  {
    /** @classification neither */
    id: uuid("id").primaryKey().defaultRandom(),
    /** @classification personal — owner id. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** @classification neither — movie, series, anime, manga or game. */
    kind: text("kind").notNull(),
    /** @classification neither */
    title: text("title").notNull(),
    /** @classification neither — normalised title, the Dogear match key. */
    titleNorm: text("title_norm").notNull(),
    /** @classification neither */
    year: smallint("year"),
    /** @classification personal — canonical status (PLAN.md section 3). */
    status: text("status"),
    /** @classification personal — last-write-wins clock for sync. */
    statusAt: timestamp("status_at", { withTimezone: true }),
    /** @classification personal — games only: own, wishlist or trash. */
    shelf: text("shelf"),
    /** @classification personal */
    rating: smallint("rating"),
    /** @classification personal */
    notes: text("notes").notNull().default(""),
    /** @classification personal — read whole; validated by the entries service. */
    progress: jsonb("progress").notNull().default({}),
    /** @classification personal */
    repeatCount: integer("repeat_count").notNull().default(0),
    /** @classification personal */
    device: text("device"),
    /** @classification personal */
    storefront: text("storefront"),
    /** @classification neither — catalog `games.id`, deliberately no FK. */
    gameId: text("game_id"),
    /** @classification neither */
    extSource: text("ext_source"),
    /** @classification neither */
    extId: text("ext_id"),
    /** @classification neither */
    imageUrl: text("image_url"),
    /** @classification personal */
    startedAt: timestamp("started_at", { withTimezone: true }),
    /** @classification personal */
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
    /** @classification neither */
    deletedAt: deletedAt(),
  },
  (table) => [
    unique("entries_id_user_id_key").on(table.id, table.userId),
    check("entries_kind_check", sql`${table.kind} IN (${KINDS_SQL})`),
    check("entries_title_length", sql`char_length(${table.title}) BETWEEN 1 AND 160`),
    check("entries_status_check", sql`${table.status} IN (${STATUSES_SQL})`),
    check("entries_shelf_check", sql`${table.shelf} IN (${SHELVES_SQL})`),
    check("entries_shelf_game_only", sql`${table.shelf} IS NULL OR ${table.kind} = 'game'`),
    check("entries_rating_range", sql`${table.rating} BETWEEN 1 AND 10`),
    check("entries_notes_length", sql`char_length(${table.notes}) <= 4000`),
    check("entries_progress_object", sql`jsonb_typeof(${table.progress}) = 'object'`),
    check("entries_repeat_count_check", sql`${table.repeatCount} >= 0`),
    check("entries_ext_source_check", sql`${table.extSource} IN (${EXT_SOURCES_SQL})`),
    httpsUrlCheck("entries_image_url_check", table.imageUrl),
    uniqueIndex("entries_user_game_key")
      .on(table.userId, table.gameId)
      .where(sql`${table.gameId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    uniqueIndex("entries_user_ext_key")
      .on(table.userId, table.extSource, table.extId)
      .where(sql`${table.extId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    // The expected plans of the four hot queries are in the migration (DB-22).
    index("entries_library_idx")
      .on(table.userId, table.kind, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index("entries_match_idx")
      .on(table.userId, table.titleNorm, table.kind)
      .where(sql`${table.deletedAt} IS NULL`),
    index("entries_sync_idx").on(table.userId, table.updatedAt, table.id),
    index("entries_deleted_at_idx").on(table.deletedAt).where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

/** Dogear tile -> entry. */
export const entryLinks = pgTable(
  "entry_links",
  {
    /** @classification personal — owner id. */
    userId: text("user_id").notNull(),
    /** @classification neither */
    platform: text("platform").notNull(),
    /** @classification neither */
    platformId: text("platform_id").notNull(),
    /** @classification neither */
    entryId: uuid("entry_id").notNull(),
    /** @classification personal — viewing history. */
    url: text("url"),
    /** @classification neither */
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      name: "entry_links_pkey",
      columns: [table.userId, table.platform, table.platformId],
    }),
    foreignKey({
      name: "entry_links_entry_fkey",
      columns: [table.entryId, table.userId],
      foreignColumns: [entries.id, entries.userId],
    }).onDelete("cascade"),
    check("entry_links_platform_check", sql`${table.platform} IN (${PLATFORMS_SQL})`),
    check(
      "entry_links_platform_id_check",
      sql`char_length(${table.platformId}) <= 128 AND ${table.platformId} ~ '^[A-Za-z0-9_-]+$'`,
    ),
    httpsUrlCheck("entry_links_url_check", table.url),
    index("entry_links_entry_id_idx").on(table.entryId),
  ],
);

export const lists = pgTable(
  "lists",
  {
    /** @classification neither */
    id: uuid("id").primaryKey().defaultRandom(),
    /** @classification personal — owner id. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** @classification personal */
    name: text("name").notNull(),
    /** @classification personal */
    description: text("description").notNull().default(""),
    /** @classification neither */
    kinds: text("kinds").array().notNull().default(sql`'{}'`),
    /** @classification neither */
    createdAt: createdAt(),
    /** @classification neither */
    updatedAt: updatedAt(),
    /** @classification neither */
    deletedAt: deletedAt(),
  },
  (table) => [
    unique("lists_id_user_id_key").on(table.id, table.userId),
    check("lists_name_length", sql`char_length(${table.name}) BETWEEN 1 AND 80`),
    check("lists_description_length", sql`char_length(${table.description}) <= 500`),
    check("lists_kinds_check", sql`${table.kinds} <@ ARRAY[${KINDS_SQL}]::text[]`),
    uniqueIndex("lists_user_name_key")
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    index("lists_user_updated_idx")
      .on(table.userId, table.updatedAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const listItems = pgTable(
  "list_items",
  {
    /** @classification neither */
    id: uuid("id").primaryKey().defaultRandom(),
    /** @classification neither */
    listId: uuid("list_id").notNull(),
    /** @classification personal — owner id. */
    userId: text("user_id").notNull(),
    /** @classification neither */
    kind: text("kind").notNull(),
    /** @classification neither */
    title: text("title").notNull(),
    /** @classification neither */
    year: smallint("year"),
    /** @classification neither */
    extSource: text("ext_source"),
    /** @classification neither */
    extId: text("ext_id"),
    /** @classification neither */
    imageUrl: text("image_url"),
    /** @classification neither */
    sortOrder: integer("sort_order").notNull(),
    /** @classification neither */
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "list_items_list_fkey",
      columns: [table.listId, table.userId],
      foreignColumns: [lists.id, lists.userId],
    }).onDelete("cascade"),
    check("list_items_kind_check", sql`${table.kind} IN (${KINDS_SQL})`),
    check("list_items_title_length", sql`char_length(${table.title}) BETWEEN 1 AND 160`),
    check("list_items_ext_source_check", sql`${table.extSource} IN (${EXT_SOURCES_SQL})`),
    httpsUrlCheck("list_items_image_url_check", table.imageUrl),
    uniqueIndex("list_items_list_ext_key")
      .on(table.listId, table.extSource, table.extId)
      .where(sql`${table.extId} IS NOT NULL`),
    index("list_items_list_sort_idx").on(table.listId, table.sortOrder),
  ],
);
