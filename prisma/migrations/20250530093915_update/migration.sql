-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "isActivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organiser" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;
