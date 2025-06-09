/*
  Warnings:

  - Added the required column `categrory` to the `crowdsource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fee` to the `crowdsource` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('Event', 'Place');

-- AlterTable
ALTER TABLE "crowdsource" ADD COLUMN     "categrory" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "fee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tag" "Tag" NOT NULL DEFAULT 'Place',
ADD COLUMN     "time" TEXT,
ADD COLUMN     "tips" TEXT;
