/*
  Warnings:

  - You are about to drop the column `adminId` on the `admin` table. All the data in the column will be lost.
  - The `role` column on the `admin` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `creatorId` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `creatorType` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `organiserStaffId` on the `event` table. All the data in the column will be lost.
  - The `role` column on the `organiser` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `organiser_staff` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANISER');

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_organiserStaffId_fkey";

-- DropForeignKey
ALTER TABLE "organiser_staff" DROP CONSTRAINT "organiser_staff_organiserId_fkey";

-- AlterTable
ALTER TABLE "admin" DROP COLUMN "adminId",
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "event" DROP COLUMN "creatorId",
DROP COLUMN "creatorType",
DROP COLUMN "organiserStaffId";

-- AlterTable
ALTER TABLE "organiser" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ORGANISER';

-- DropTable
DROP TABLE "organiser_staff";

-- DropEnum
DROP TYPE "AdminRole";

-- DropEnum
DROP TYPE "OrganiserRole";
