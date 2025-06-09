-- CreateEnum

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANISER', 'GUARDIAN');
  END IF;
END$$;


-- CreateEnum BookingStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Confirmed', 'Failed', 'Cancelled', 'Refunded');
  END IF;
END$$;

-- CreateEnum Tag
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Tag') THEN
    CREATE TYPE "Tag" AS ENUM ('Event', 'Place');
  END IF;
END$$;

-- CreateEnum ActivationStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivationStatus') THEN
    CREATE TYPE "ActivationStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
  END IF;
END$$;


-- CreateTable
CREATE TABLE IF NOT EXISTS "admin" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email_verify" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verification_token_expiration" TEXT,
    "reset_token" TEXT,
    "reset_expiration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fcmToken" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "fcmIsOn" BOOLEAN NOT NULL DEFAULT false,
    "activationStatus" "ActivationStatus" NOT NULL DEFAULT 'PENDING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "organiser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "business_logo" TEXT,
    "address" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_category" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "email_verify" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "website_url" TEXT,
    "facebook_url" TEXT,
    "verification_token" TEXT,
    "verification_token_expiration" TEXT,
    "reset_token" TEXT,
    "reset_expiration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fcmToken" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ORGANISER',
    "fcmIsOn" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT NOT NULL,
    "profile_picture" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "address" TEXT,
    "password" TEXT NOT NULL,
    "guardian_type" TEXT,
    "email_verify" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "verification_token" TEXT,
    "verification_token_expiration" TEXT,
    "reset_token" TEXT,
    "reset_expiration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fcmToken" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GUARDIAN',
    "fcmIsOn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "images" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "total_ticket" INTEGER NOT NULL,
    "ticket_booked" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "age_range" TEXT NOT NULL,
    "instruction" TEXT,
    "category" TEXT NOT NULL,
    "isPublished" BOOLEAN DEFAULT false,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT,
    "organiserId" TEXT,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "crowdsource" (
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
    "date" TIMESTAMP(3),
    "fee" DECIMAL(65,30) NOT NULL,
    "tag" "Tag" NOT NULL DEFAULT 'Place',
    "time" TEXT,
    "tips" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "facilities" TEXT[],

    CONSTRAINT "crowdsource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticket_quantity" INTEGER NOT NULL,
    "sessionId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'Pending',
    "isDeleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "consent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "crowdSourceId" TEXT,
    "commentId" TEXT,
    "reviewId" TEXT,

    CONSTRAINT "like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crowdSourceId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blacklisted_token" (
    "id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklisted_token_pkey" PRIMARY KEY ("id")
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'admin_email_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'admin_email_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "admin_email_idx" ON "admin"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'organiser_email_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "organiser_email_key" ON "organiser"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'organiser_business_name_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "organiser_business_name_key" ON "organiser"("business_name");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'organiser_email_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "organiser_email_idx" ON "organiser"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'user_email_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'user_email_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "user_email_idx" ON "user"("email");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'event_category_isPublished_age_range_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "event_category_isPublished_age_range_idx" ON "event"("category", "isPublished", "age_range");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'crowdsource_address_isVerified_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "crowdsource_address_isVerified_idx" ON "crowdsource"("address", "isVerified");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'booking_userId_eventId_sessionId_status_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "booking_userId_eventId_sessionId_status_idx" ON "booking"("userId", "eventId", "sessionId", "status");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'favorite_eventId_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "favorite_eventId_key" ON "favorite"("eventId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'like_userId_eventId_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "like_userId_eventId_key" ON "like"("userId", "eventId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'like_userId_crowdSourceId_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "like_userId_crowdSourceId_key" ON "like"("userId", "crowdSourceId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'like_userId_commentId_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "like_userId_commentId_key" ON "like"("userId", "commentId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'like_userId_reviewId_key' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "like_userId_reviewId_key" ON "like"("userId", "reviewId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'comment_crowdSourceId_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "comment_crowdSourceId_idx" ON "comment"("crowdSourceId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'review_rating_idx' AND c.relkind = 'i' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX "review_rating_idx" ON "review"("rating");
  END IF;
END$$;

-- Foreign Keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_adminId_fkey') THEN
    ALTER TABLE "event" ADD CONSTRAINT "event_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_organiserId_fkey') THEN
    ALTER TABLE "event" ADD CONSTRAINT "event_organiserId_fkey"
      FOREIGN KEY ("organiserId") REFERENCES "organiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crowdsource_creatorId_fkey') THEN
    ALTER TABLE "crowdsource" ADD CONSTRAINT "crowdsource_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_eventId_fkey') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_userId_fkey') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consent_bookingId_fkey') THEN
    ALTER TABLE "consent" ADD CONSTRAINT "consent_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorite_eventId_fkey') THEN
    ALTER TABLE "favorite" ADD CONSTRAINT "favorite_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorite_userId_fkey') THEN
    ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'like_commentId_fkey') THEN
    ALTER TABLE "like" ADD CONSTRAINT "like_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'like_reviewId_fkey') THEN
    ALTER TABLE "like" ADD CONSTRAINT "like_reviewId_fkey"
      FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'like_crowdSourceId_fkey') THEN
    ALTER TABLE "like" ADD CONSTRAINT "like_crowdSourceId_fkey"
      FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'like_eventId_fkey') THEN
    ALTER TABLE "like" ADD CONSTRAINT "like_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'like_userId_fkey') THEN
    ALTER TABLE "like" ADD CONSTRAINT "like_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recommendation_eventId_fkey') THEN
    ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recommendation_userId_fkey') THEN
    ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_crowdSourceId_fkey') THEN
    ALTER TABLE "comment" ADD CONSTRAINT "comment_crowdSourceId_fkey"
      FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_parentId_fkey') THEN
    ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_userId_fkey') THEN
    ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_eventId_fkey') THEN
    ALTER TABLE "review" ADD CONSTRAINT "review_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
