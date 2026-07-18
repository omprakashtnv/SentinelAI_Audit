CREATE TABLE "github_repository_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "imported_by_user_id" UUID NOT NULL,
    "owner" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "repository_url" VARCHAR(2048) NOT NULL,
    "clone_url" VARCHAR(2048) NOT NULL,
    "default_branch" VARCHAR(255) NOT NULL,
    "commit_sha" CHAR(40) NOT NULL,
    "local_path" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repository_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_github_repository_imports_project_id_created_at"
ON "github_repository_imports"("project_id", "created_at");

CREATE INDEX "idx_github_repository_imports_imported_by_user_id"
ON "github_repository_imports"("imported_by_user_id");

ALTER TABLE "github_repository_imports"
ADD CONSTRAINT "github_repository_imports_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "github_repository_imports"
ADD CONSTRAINT "github_repository_imports_imported_by_user_id_fkey"
FOREIGN KEY ("imported_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
