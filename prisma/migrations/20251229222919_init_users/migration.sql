-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenat_id" TEXT NOT NULL,
    "keycloak_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_id_key" ON "users"("keycloak_id");

-- CreateIndex
CREATE INDEX "users_tenat_id_idx" ON "users"("tenat_id");

-- CreateIndex
CREATE INDEX "users_keycloak_id_idx" ON "users"("keycloak_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenat_id_email_key" ON "users"("tenat_id", "email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenat_id_fkey" FOREIGN KEY ("tenat_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
