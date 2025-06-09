/*
  Warnings:

  - You are about to drop the column `creatorRef` on the `event` table. All the data in the column will be lost.
  - Added the required column `creatorType` to the `event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "creatorRef",
ADD COLUMN     "creatorType" TEXT NOT NULL;
