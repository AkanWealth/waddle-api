/*
  Warnings:

  - You are about to drop the column `verification_token` on the `vendorstaff` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token_expiration` on the `vendorstaff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vendorstaff" DROP COLUMN "verification_token",
DROP COLUMN "verification_token_expiration";
