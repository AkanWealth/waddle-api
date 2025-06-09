/*
  Warnings:

  - You are about to drop the column `skip` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `take` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "skip",
DROP COLUMN "take";
