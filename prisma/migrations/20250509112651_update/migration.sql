-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "organiser" ADD COLUMN     "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "organiser_staff" ADD COLUMN     "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "fcmToken" TEXT;
