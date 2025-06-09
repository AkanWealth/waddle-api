/*
  Warnings:

  - You are about to drop the column `isActivated` on the `admin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admin" DROP COLUMN "isActivated",
ADD COLUMN     "activationStatus" "ActivationStatus" NOT NULL DEFAULT 'PENDING';
