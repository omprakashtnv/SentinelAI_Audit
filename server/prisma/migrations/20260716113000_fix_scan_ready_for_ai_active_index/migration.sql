DROP INDEX IF EXISTS "uq_scans_project_active";

CREATE UNIQUE INDEX "uq_scans_project_active"
ON "scans"("project_id")
WHERE "status" IN ('QUEUED', 'PARSING', 'INDEXING', 'READY_FOR_AI', 'AI_SCANNING', 'PROCESSING_RESULTS');
