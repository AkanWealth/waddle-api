/*
  Warnings:

  - You are about to drop the column `vendorId` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `vendorStaffId` on the `event` table. All the data in the column will be lost.
  - You are about to drop the `vendor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vendorstaff` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganiserRole" AS ENUM ('ORGANISER', 'MANAGER');

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_vendorStaffId_fkey";

-- DropForeignKey
ALTER TABLE "vendorstaff" DROP CONSTRAINT "vendorstaff_vendorId_fkey";

-- AlterTable
ALTER TABLE "admin" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "event" DROP COLUMN "vendorId",
DROP COLUMN "vendorStaffId",
ADD COLUMN     "organiserId" TEXT,
ADD COLUMN     "organiserStaffId" TEXT;

-- DropTable
DROP TABLE "vendor";

-- DropTable
DROP TABLE "vendorstaff";

-- DropEnum
DROP TYPE "VendorRole";

-- CreateTable
CREATE TABLE "organiser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "role" "OrganiserRole" NOT NULL DEFAULT 'ORGANISER',
    "business_logo" TEXT,
    "address" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_category" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "email_verify" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "website_url" TEXT,
    "facebook_url" TEXT,
    "verification_token" TEXT,
    "verification_token_expiration" TEXT,
    "reset_token" TEXT,
    "reset_expiration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organiser_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "role" "OrganiserRole" NOT NULL DEFAULT 'MANAGER',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "reset_token" TEXT,
    "reset_expiration" TEXT,
    "organiserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organiser_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organiser_email_key" ON "organiser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organiser_business_name_key" ON "organiser"("business_name");

-- CreateIndex
CREATE UNIQUE INDEX "organiser_staff_email_key" ON "organiser_staff"("email");

-- AddForeignKey
ALTER TABLE "organiser_staff" ADD CONSTRAINT "organiser_staff_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "organiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_organiserStaffId_fkey" FOREIGN KEY ("organiserStaffId") REFERENCES "organiser_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
