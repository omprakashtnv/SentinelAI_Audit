CREATE TYPE "FindingSeverity" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFO'
);

CREATE TYPE "FindingStatus" AS ENUM (
    'OPEN',
    'DISMISSED',
    'RESOLVED'
);

CREATE TABLE "findings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "scan_id" UUID,
    "rule_id" VARCHAR(160),
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "category" VARCHAR(80),
    "owasp" VARCHAR(160),
    "recommendation" TEXT,
    "confidence" VARCHAR(20),
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "dismissed_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_findings_line_positive" CHECK ("line" > 0)
);

CREATE INDEX "idx_findings_project_id_status_severity"
ON "findings"("project_id", "status", "severity");

CREATE INDEX "idx_findings_project_id_created_at"
ON "findings"("project_id", "created_at");

CREATE INDEX "idx_findings_scan_id"
ON "findings"("scan_id");

CREATE INDEX "idx_findings_deleted_at"
ON "findings"("deleted_at");

ALTER TABLE "findings"
ADD CONSTRAINT "findings_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "findings"
ADD CONSTRAINT "findings_scan_id_fkey"
FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
