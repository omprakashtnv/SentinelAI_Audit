CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" CITEXT NOT NULL,
  "name" VARCHAR(120),
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_users_email" UNIQUE ("email")
);

CREATE TABLE "refresh_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "token_hash" CHAR(64) NOT NULL,
  "user_id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "replaced_by_token_id" UUID,
  "created_by_ip" INET,
  "revoked_by_ip" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_refresh_tokens_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
CREATE INDEX "idx_refresh_tokens_family_id" ON "refresh_tokens"("family_id");
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");
