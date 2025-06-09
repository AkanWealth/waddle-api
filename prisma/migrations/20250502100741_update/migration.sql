/*
  Warnings:

  - The values [Admin,Editor,Viewer] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [Vendor,Representative,Support] on the enum `VendorRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('ADMIN', 'EDITOR');
ALTER TABLE "admin" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "AdminRole_old";
ALTER TABLE "admin" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VendorRole_new" AS ENUM ('ORGANISER', 'MANAGER');
ALTER TABLE "vendor" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "vendorstaff" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "vendor" ALTER COLUMN "role" TYPE "VendorRole_new" USING ("role"::text::"VendorRole_new");
ALTER TABLE "vendorstaff" ALTER COLUMN "role" TYPE "VendorRole_new" USING ("role"::text::"VendorRole_new");
ALTER TYPE "VendorRole" RENAME TO "VendorRole_old";
ALTER TYPE "VendorRole_new" RENAME TO "VendorRole";
DROP TYPE "VendorRole_old";
ALTER TABLE "vendor" ALTER COLUMN "role" SET DEFAULT 'ORGANISER';
ALTER TABLE "vendorstaff" ALTER COLUMN "role" SET DEFAULT 'MANAGER';
COMMIT;

-- AlterTable
ALTER TABLE "admin" ALTER COLUMN "role" SET DEFAULT 'EDITOR';

-- AlterTable
ALTER TABLE "vendor" ALTER COLUMN "role" SET DEFAULT 'ORGANISER';

-- AlterTable
ALTER TABLE "vendorstaff" ALTER COLUMN "role" SET DEFAULT 'MANAGER';
