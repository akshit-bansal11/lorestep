-- Reverts 0003. Every entry becomes eligible for enrichment again.
ALTER TABLE entries DROP COLUMN IF EXISTS enriched_at;
