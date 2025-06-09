-- AddForeignKey
ALTER TABLE "crowdsource" ADD CONSTRAINT "crowdsource_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
