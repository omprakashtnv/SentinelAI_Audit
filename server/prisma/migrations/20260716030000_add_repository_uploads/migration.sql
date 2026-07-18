CREATE TABLE "repository_uploads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "uploaded_by_user_id" UUID NOT NULL,
  "original_filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(120) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "extracted_path" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "repository_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "repository_uploads_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "repository_uploads_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_repository_uploads_project_id_created_at"
  ON "repository_uploads"("project_id", "created_at");

CREATE INDEX "idx_repository_uploads_uploaded_by_user_id"
  ON "repository_uploads"("uploaded_by_user_id");
