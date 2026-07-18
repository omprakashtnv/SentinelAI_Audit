ALTER TABLE "scans"
ADD COLUMN "security_findings" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "security_summary" JSONB NOT NULL DEFAULT '{}'::jsonb;
