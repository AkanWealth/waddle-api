/*
  Warnings:

  - A unique constraint covering the columns `[userId,commentId]` on the table `like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,reviewId]` on the table `like` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "like_userId_commentId_key" ON "like"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "like_userId_reviewId_key" ON "like"("userId", "reviewId");
