/*
  Warnings:

  - You are about to drop the column `instruction` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "instruction",
ADD COLUMN     "instructions" TEXT[];
