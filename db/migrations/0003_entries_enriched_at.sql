-- Metadata enrichment marker (src/services/metadata/enrich-entries.ts): set once the year, poster
-- and anime kind were looked up for an entry, hit or miss, so a miss is never retried. Mirrored by
-- `entries.enrichedAt` in src/lib/db/schema.ts. Re-runnable (DB-D06).
ALTER TABLE entries ADD COLUMN IF NOT EXISTS enriched_at timestamptz; -- neither
