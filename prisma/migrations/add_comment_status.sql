-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROPRIATE', 'INAPPROPRIATE');

-- AlterTable
ALTER TABLE "comment"
ADD COLUMN "status" "CommentStatus" NOT NULL DEFAULT 'PENDING';