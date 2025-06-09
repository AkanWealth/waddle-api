-- AlterTable
ALTER TABLE "crowdsource" ADD COLUMN     "likeId" TEXT;

-- AddForeignKey
ALTER TABLE "crowdsource" ADD CONSTRAINT "crowdsource_likeId_fkey" FOREIGN KEY ("likeId") REFERENCES "like"("id") ON DELETE SET NULL ON UPDATE CASCADE;
