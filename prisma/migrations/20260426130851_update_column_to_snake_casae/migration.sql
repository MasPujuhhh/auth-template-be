/*
  Warnings:

  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerifiedAt` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ms_users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expiredAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `sessions` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `ms_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expired_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refresh_token` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_userId_idx";

-- DropIndex
DROP INDEX "ms_users_provider_providerId_idx";

-- DropIndex
DROP INDEX "sessions_expiredAt_idx";

-- DropIndex
DROP INDEX "sessions_userId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "ms_users" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "emailVerifiedAt",
DROP COLUMN "isActive",
DROP COLUMN "providerId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "provider_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "createdAt",
DROP COLUMN "expiredAt",
DROP COLUMN "ipAddress",
DROP COLUMN "refreshToken",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "refresh_token" TEXT NOT NULL,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ms_users_provider_provider_id_idx" ON "ms_users"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "ms_users_deleted_at_idx" ON "ms_users"("deleted_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expired_at_idx" ON "sessions"("expired_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
