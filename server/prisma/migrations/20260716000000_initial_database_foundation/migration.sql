-- SentinelAI initial PostgreSQL foundation.
-- No application tables are created in this migration.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

COMMENT ON SCHEMA public IS 'SentinelAI application schema. Domain tables are intentionally deferred.';

