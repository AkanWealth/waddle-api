/*
  Warnings:

  - You are about to drop the column `end_time` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `payment` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `total_price` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `end_date` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "end_time",
DROP COLUMN "payment",
DROP COLUMN "start_time",
DROP COLUMN "total_price",
ADD COLUMN     "end_date" TEXT NOT NULL,
ADD COLUMN     "start_date" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "Payment" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
