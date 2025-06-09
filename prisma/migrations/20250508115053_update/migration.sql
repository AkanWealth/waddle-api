-- DropForeignKey
ALTER TABLE "like" DROP CONSTRAINT "like_eventId_fkey";

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "likeId" TEXT;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_likeId_fkey" FOREIGN KEY ("likeId") REFERENCES "like"("id") ON DELETE SET NULL ON UPDATE CASCADE;
