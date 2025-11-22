/*
  Warnings:

  - You are about to drop the column `logoUrl` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "logoUrl",
ADD COLUMN     "logo_url" TEXT;
