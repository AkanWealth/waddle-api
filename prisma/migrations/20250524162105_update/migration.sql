-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "fcmIsOn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "crowdsource" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organiser" ADD COLUMN     "fcmIsOn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "fcmIsOn" BOOLEAN NOT NULL DEFAULT false;
