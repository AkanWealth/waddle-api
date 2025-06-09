/*
  Warnings:

  - You are about to alter the column `fee` on the `crowdsource` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "crowdsource" ALTER COLUMN "fee" SET DATA TYPE DECIMAL(65,30);
