-- AlterTable
ALTER TABLE "crowdsource" ALTER COLUMN "facilities" DROP NOT NULL,
ALTER COLUMN "facilities" SET DATA TYPE TEXT;
