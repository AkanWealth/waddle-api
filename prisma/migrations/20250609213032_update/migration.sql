/*
  Warnings:

  - Made the column `payment_intent` on table `booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "booking" ALTER COLUMN "payment_intent" DROP NOT NULL;
