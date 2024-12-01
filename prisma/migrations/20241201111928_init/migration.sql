/*
  Warnings:

  - Added the required column `activitiesId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activitiesId` to the `collections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "activitiesId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "activitiesId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "amenities" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_activitiesId_fkey" FOREIGN KEY ("activitiesId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_activitiesId_fkey" FOREIGN KEY ("activitiesId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
