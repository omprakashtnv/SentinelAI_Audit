CREATE TYPE "ScanStatus" AS ENUM (
    'QUEUED',
    'PARSING',
    'INDEXING',
    'READY_FOR_AI',
    'AI_SCANNING',
    'PROCESSING_RESULTS',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE "scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "retry_of_scan_id" UUID,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "source_type" VARCHAR(20),
    "source_ref" TEXT,
    "total_files_discovered" INTEGER NOT NULL DEFAULT 0,
    "parsed_files" INTEGER NOT NULL DEFAULT 0,
    "skipped_files" INTEGER NOT NULL DEFAULT 0,
    "total_parsed_bytes" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "elapsed_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_scans_progress_range" CHECK ("progress" >= 0 AND "progress" <= 100),
    CONSTRAINT "chk_scans_attempt_positive" CHECK ("attempt" > 0),
    CONSTRAINT "chk_scans_elapsed_ms_non_negative" CHECK ("elapsed_ms" IS NULL OR "elapsed_ms" >= 0)
);

CREATE INDEX "idx_scans_project_id_created_at"
ON "scans"("project_id", "created_at");

CREATE INDEX "idx_scans_project_id_status"
ON "scans"("project_id", "status");

CREATE INDEX "idx_scans_requested_by_user_id"
ON "scans"("requested_by_user_id");

CREATE INDEX "idx_scans_retry_of_scan_id"
ON "scans"("retry_of_scan_id");

CREATE UNIQUE INDEX "uq_scans_project_active"
ON "scans"("project_id")
WHERE "status" IN ('QUEUED', 'PARSING', 'INDEXING', 'AI_SCANNING', 'PROCESSING_RESULTS');

ALTER TABLE "scans"
ADD CONSTRAINT "scans_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scans"
ADD CONSTRAINT "scans_requested_by_user_id_fkey"
FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scans"
ADD CONSTRAINT "scans_retry_of_scan_id_fkey"
FOREIGN KEY ("retry_of_scan_id") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
