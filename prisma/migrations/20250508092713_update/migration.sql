-- CreateTable
CREATE TABLE "crowdsource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "images" TEXT[],
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crowdsource_pkey" PRIMARY KEY ("id")
);
