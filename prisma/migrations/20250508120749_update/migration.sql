/*
  Warnings:

  - You are about to drop the column `likeId` on the `crowdsource` table. All the data in the column will be lost.
  - You are about to drop the column `likeId` on the `event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,eventId]` on the table `like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,crowdSourceId]` on the table `like` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "crowdsource" DROP CONSTRAINT "crowdsource_likeId_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_likeId_fkey";

-- DropIndex
DROP INDEX "like_eventId_key";

-- AlterTable
ALTER TABLE "crowdsource" DROP COLUMN "likeId";

-- AlterTable
ALTER TABLE "event" DROP COLUMN "likeId";

-- AlterTable
ALTER TABLE "like" ADD COLUMN     "crowdSourceId" TEXT,
ALTER COLUMN "eventId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "like_userId_eventId_key" ON "like"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "like_userId_crowdSourceId_key" ON "like"("userId", "crowdSourceId");

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_crowdSourceId_fkey" FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
