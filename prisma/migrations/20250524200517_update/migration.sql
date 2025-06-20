/*
  Warnings:

  - You are about to drop the column `categrory` on the `crowdsource` table. All the data in the column will be lost.
  - Added the required column `category` to the `crowdsource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "crowdsource" DROP COLUMN "categrory",
ADD COLUMN     "category" TEXT NOT NULL;
