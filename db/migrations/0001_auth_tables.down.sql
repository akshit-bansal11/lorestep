-- Reverts 0001. Drops in reverse FK order: the tables referencing users go first. Indexes and
-- constraints go with their tables. Destroys every account and session.
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS auth_rate_limits;
DROP TABLE IF EXISTS device_codes;
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
