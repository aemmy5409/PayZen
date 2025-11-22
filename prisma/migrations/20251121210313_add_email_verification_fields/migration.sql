-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verification_token" TEXT,
ADD COLUMN     "verification_token_expires_at" TIMESTAMP(3);
