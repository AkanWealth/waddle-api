-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crowdSourceId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_crowdSourceId_idx" ON "comment"("crowdSourceId");

-- CreateIndex
CREATE INDEX "admin_email_idx" ON "admin"("email");

-- CreateIndex
CREATE INDEX "booking_userId_eventId_sessionId_status_idx" ON "booking"("userId", "eventId", "sessionId", "status");

-- CreateIndex
CREATE INDEX "crowdsource_address_isVerified_idx" ON "crowdsource"("address", "isVerified");

-- CreateIndex
CREATE INDEX "event_category_isPublished_age_range_idx" ON "event"("category", "isPublished", "age_range");

-- CreateIndex
CREATE INDEX "organiser_email_idx" ON "organiser"("email");

-- CreateIndex
CREATE INDEX "organiser_staff_email_idx" ON "organiser_staff"("email");

-- CreateIndex
CREATE INDEX "payment_status_transactionId_idx" ON "payment"("status", "transactionId");

-- CreateIndex
CREATE INDEX "review_rating_idx" ON "review"("rating");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_crowdSourceId_fkey" FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
