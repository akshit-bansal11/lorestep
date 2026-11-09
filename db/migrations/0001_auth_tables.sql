-- The app's own fixed-window limiter (rate_limits). Accounts, sessions and every credential live
-- in Neon Auth's managed `neon_auth` schema, never here (PLAN.md section 12, N-8); the filename
-- is kept from the Better-Auth era so existing branches merge cleanly. Each column carries its
-- DB-14 classification. Re-runnable (DB-D06).

-- One atomic upsert per request (PLAN.md D-11).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text NOT NULL,                                  -- personal (user id or client IP)
  window_start bigint NOT NULL,                          -- neither (epoch seconds)
  count integer NOT NULL DEFAULT 0,                      -- neither
  PRIMARY KEY (bucket, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits (window_start);
