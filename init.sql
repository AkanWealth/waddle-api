-- Create enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANISER', 'GUARDIAN');
CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Confirmed', 'Failed', 'Cancelled', 'Refunded');
CREATE TYPE "Tag" AS ENUM ('Event', 'Place');

-- Create admin table
CREATE TABLE "admin" (
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
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- Create organiser table
CREATE TABLE "organiser" (
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

-- Create user table
CREATE TABLE "user" (
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

-- Create event table
CREATE TABLE "event" (
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

-- Create crowdsource table
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

-- Create booking table
CREATE TABLE "booking" (
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

-- Create consent table
CREATE TABLE "consent" (
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

-- Create favorite table
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- Create like table
CREATE TABLE "like" (
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

-- Create recommendation table
CREATE TABLE "recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("id")
);

-- Create comment table
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

-- Create review table
CREATE TABLE "review" (
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

-- Create blacklisted_token table
CREATE TABLE "blacklisted_token" (
    "id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklisted_token_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");
CREATE UNIQUE INDEX "organiser_email_key" ON "organiser"("email");
CREATE UNIQUE INDEX "organiser_business_name_key" ON "organiser"("business_name");
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "favorite_eventId_key" ON "favorite"("eventId");

-- Create other indexes
CREATE INDEX "admin_email_idx" ON "admin"("email");
CREATE INDEX "organiser_email_idx" ON "organiser"("email");
CREATE INDEX "user_email_idx" ON "user"("email");
CREATE INDEX "event_category_isPublished_age_range_idx" ON "event"("category", "isPublished", "age_range");
CREATE INDEX "crowdsource_address_isVerified_idx" ON "crowdsource"("address", "isVerified");
CREATE INDEX "booking_userId_eventId_sessionId_status_idx" ON "booking"("userId", "eventId", "sessionId", "status");
CREATE INDEX "comment_crowdSourceId_idx" ON "comment"("crowdSourceId");
CREATE INDEX "review_rating_idx" ON "review"("rating");

-- Create unique constraints for like table
ALTER TABLE "like" ADD CONSTRAINT "like_userId_eventId_key" UNIQUE ("userId", "eventId");
ALTER TABLE "like" ADD CONSTRAINT "like_userId_crowdSourceId_key" UNIQUE ("userId", "crowdSourceId");
ALTER TABLE "like" ADD CONSTRAINT "like_userId_commentId_key" UNIQUE ("userId", "commentId");
ALTER TABLE "like" ADD CONSTRAINT "like_userId_reviewId_key" UNIQUE ("userId", "reviewId");

-- Add foreign key constraints
ALTER TABLE "event" ADD CONSTRAINT "event_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event" ADD CONSTRAINT "event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "organiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crowdsource" ADD CONSTRAINT "crowdsource_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking" ADD CONSTRAINT "booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent" ADD CONSTRAINT "consent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "like" ADD CONSTRAINT "like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "like" ADD CONSTRAINT "like_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "like" ADD CONSTRAINT "like_crowdSourceId_fkey" FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "like" ADD CONSTRAINT "like_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "like" ADD CONSTRAINT "like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_crowdSourceId_fkey" FOREIGN KEY ("crowdSourceId") REFERENCES "crowdsource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review" ADD CONSTRAINT "review_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert dummy data

-- Insert admin data
INSERT INTO "admin" ("id", "first_name", "last_name", "email", "password", "email_verify", "verification_token", "verification_token_expiration", "reset_token", "reset_expiration", "createdAt", "updatedAt", "fcmToken", "role", "fcmIsOn", "isActivated", "isDeleted") VALUES 
('cmb6jl52d000sztr6ukfu5nb0', 'Ade', 'owoeye', 'owoeyeadenike2020@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$QIp/VX4PtcTAlmZe9Ox5GQ$aqmRfGwfqVmTXmigAaeVDq0eoi/Y9EgnUjhoIcoMUZQ', true, NULL, NULL, NULL, NULL, '2025-05-27 13:18:31.91', '2025-05-30 19:55:40.81', NULL, 'ADMIN', false, true, false),
('cmbbcn913000j104dhug577lj', 'Eunice', 'ogolouwa', 'adenike.owoeye@recreax.com', '$argon2id$v=19$m=65536,t=3,p=4$M+1mIGLgyaT7HhEFhl12ZQ$UBtxtN6rKxI6voebUxPpCXb2mDQrZL6qJOrsAmV4mAI', false, NULL, NULL, 'vtk4gt3nbjh', '1748646212579', '2025-05-30 22:03:03.927', '2025-05-30 22:03:32.58', NULL, 'ADMIN', false, false, false);

-- Insert organisers
INSERT INTO "organiser" ("id", "name", "email", "password", "phone_number", "business_logo", "address", "business_name", "business_category", "registration_number", "email_verify", "isLocked", "isDeleted", "isVerified", "failedLoginAttempts", "website_url", "facebook_url", "verification_token", "verification_token_expiration", "reset_token", "reset_expiration", "createdAt", "updatedAt", "fcmToken", "role", "fcmIsOn", "isApproved") VALUES
('org1id2345678901234567890', 'Sarah Johnson', 'sarah@funworld.com', '$argon2id$v=19$m=65536,t=3,p=4$QIp/VX4PtcTAlmZe9Ox5GQ$aqmRfGwfqVmTXmigAaeVDq0eoi/Y9EgnUjhoIcoMUZQ', '+2348012345678', 'https://example.com/logo1.png', '123 Victoria Island, Lagos, Nigeria', 'FunWorld Adventures', 'Entertainment', 'RC123456', true, false, false, true, 0, 'https://funworld.com', 'https://facebook.com/funworld', NULL, NULL, NULL, NULL, '2025-01-15 10:30:00', '2025-01-15 10:30:00', NULL, 'ORGANISER', false, true),
('org2id3456789012345678901', 'Michael Adebayo', 'michael@kidszone.ng', '$argon2id$v=19$m=65536,t=3,p=4$M+1mIGLgyaT7HhEFhl12ZQ$UBtxtN6rKxI6voebUxPpCXb2mDQrZL6qJOrsAmV4mAI', '+2348023456789', 'https://example.com/logo2.png', '45 Lekki Phase 1, Lagos, Nigeria', 'KidsZone Events', 'Children Entertainment', 'RC234567', true, false, false, true, 0, 'https://kidszone.ng', 'https://facebook.com/kidszone', NULL, NULL, NULL, NULL, '2025-02-10 14:20:00', '2025-02-10 14:20:00', NULL, 'ORGANISER', false, true);

-- Insert users
INSERT INTO "user" ("id", "profile_picture", "name", "email", "phone_number", "address", "password", "guardian_type", "email_verify", "isLocked", "isDeleted", "failedLoginAttempts", "verification_token", "verification_token_expiration", "reset_token", "reset_expiration", "createdAt", "updatedAt", "fcmToken", "role", "fcmIsOn") VALUES
('usr1id234567890123456789', 'https://example.com/profile1.jpg', 'Kemi Okafor', 'kemi.okafor@email.com', '+2348034567890', '78 Surulere, Lagos, Nigeria', '$argon2id$v=19$m=65536,t=3,p=4$QIp/VX4PtcTAlmZe9Ox5GQ$aqmRfGwfqVmTXmigAaeVDq0eoi/Y9EgnUjhoIcoMUZQ', 'Parent', true, false, false, 0, NULL, NULL, NULL, NULL, '2025-03-01 09:15:00', '2025-03-01 09:15:00', NULL, 'GUARDIAN', false),
('usr2id345678901234567890', 'https://example.com/profile2.jpg', 'David Okonkwo', 'david.okonkwo@email.com', '+2348045678901', '23 Ikeja GRA, Lagos, Nigeria', '$argon2id$v=19$m=65536,t=3,p=4$M+1mIGLgyaT7HhEFhl12ZQ$UBtxtN6rKxI6voebUxPpCXb2mDQrZL6qJOrsAmV4mAI', 'Guardian', true, false, false, 0, NULL, NULL, NULL, NULL, '2025-03-05 11:30:00', '2025-03-05 11:30:00', NULL, 'GUARDIAN', false),
('usr3id456789012345678901', NULL, 'Fatima Ahmed', 'fatima.ahmed@email.com', '+2348056789012', '12 Abuja FCT, Nigeria', '$argon2id$v=19$m=65536,t=3,p=4$QIp/VX4PtcTAlmZe9Ox5GQ$aqmRfGwfqVmTXmigAaeVDq0eoi/Y9EgnUjhoIcoMUZQ', 'Parent', false, false, false, 0, 'verify123', '1748646212579', NULL, NULL, '2025-03-10 16:45:00', '2025-03-10 16:45:00', NULL, 'GUARDIAN', false);

-- Insert events
INSERT INTO "event" ("id", "name", "description", "address", "images", "price", "total_ticket", "ticket_booked", "date", "time", "age_range", "instruction", "category", "isPublished", "isDeleted", "createdAt", "updatedAt", "adminId", "organiserId") VALUES
('evt1id234567890123456789', 'Kids Fun Day', 'A wonderful day filled with games, activities, and entertainment for children aged 3-12', 'National Theatre, Iganmu, Lagos', 'https://example.com/event1.jpg,https://example.com/event1b.jpg', 5000.00, 200, 45, '2025-07-15 10:00:00', '10:00 AM - 4:00 PM', '3-12 years', 'Please bring your ID and arrive 30 minutes early', 'Entertainment', true, false, '2025-04-01 08:00:00', '2025-04-01 08:00:00', NULL, 'org1id2345678901234567890'),
('evt2id345678901234567890', 'Birthday Party Package', 'Complete birthday party setup with decorations, games, and entertainment', 'Tafawa Balewa Square, Lagos Island', 'https://example.com/event2.jpg', 15000.00, 50, 12, '2025-07-20 14:00:00', '2:00 PM - 6:00 PM', '4-15 years', 'Package includes cake, decorations, and party favors', 'Birthday', true, false, '2025-04-05 12:00:00', '2025-04-05 12:00:00', NULL, 'org2id3456789012345678901'),
('evt3id456789012345678901', 'Swimming Lessons for Kids', 'Professional swimming lessons for children in a safe environment', 'Civic Centre, Victoria Island, Lagos', 'https://example.com/event3.jpg', 8000.00, 30, 8, '2025-08-01 09:00:00', '9:00 AM - 11:00 AM', '5-16 years', 'Bring swimming gear and towels', 'Sports', true, false, '2025-04-10 15:30:00', '2025-04-10 15:30:00', 'cmb6jl52d000sztr6ukfu5nb0', NULL);

-- Insert crowdsource places
INSERT INTO "crowdsource" ("id", "name", "images", "description", "address", "creatorId", "isVerified", "isDeleted", "createdAt", "updatedAt", "date", "fee", "tag", "time", "tips", "isPublished", "category", "facilities") VALUES
('crd1id234567890123456789', 'Wonderland Amusement Park', '{"https://example.com/park1.jpg","https://example.com/park1b.jpg"}', 'Amazing amusement park with rides suitable for all ages', 'Lekki Conservation Centre, Lekki, Lagos', 'usr1id234567890123456789', true, false, '2025-03-15 10:00:00', '2025-03-15 10:00:00', '2025-07-10 08:00:00', 2000.00, 'Place', '8:00 AM - 6:00 PM', 'Best to visit early morning to avoid crowds', true, 'Recreation', '{"Parking","Restrooms","Food Court","First Aid"}'),
('crd2id345678901234567890', 'Adventure Playground', '{"https://example.com/playground1.jpg"}', 'Outdoor playground with climbing structures and slides', 'Freedom Park, Lagos Island', 'usr2id345678901234567890', false, false, '2025-03-20 14:30:00', '2025-03-20 14:30:00', NULL, 1000.00, 'Place', '7:00 AM - 7:00 PM', 'Great for evening visits when weather is cooler', true, 'Recreation', '{"Swings","Slides","Climbing Frame","Benches"}');

-- Insert bookings
INSERT INTO "booking" ("id", "userId", "eventId", "ticket_quantity", "sessionId", "status", "isDeleted", "createdAt", "updatedAt") VALUES
('bkg1id234567890123456789', 'usr1id234567890123456789', 'evt1id234567890123456789', 3, 'sess_123456789', 'Confirmed', false, '2025-04-15 09:30:00', '2025-04-15 09:30:00'),
('bkg2id345678901234567890', 'usr2id345678901234567890', 'evt2id345678901234567890', 2, 'sess_234567890', 'Confirmed', false, '2025-04-18 11:15:00', '2025-04-18 11:15:00'),
('bkg3id456789012345678901', 'usr3id456789012345678901', 'evt1id234567890123456789', 1, 'sess_345678901', 'Pending', false, '2025-04-20 16:45:00', '2025-04-20 16:45:00');

-- Insert consent forms
INSERT INTO "consent" ("id", "name", "age", "notes", "consent", "bookingId", "createdAt", "updatedAt") VALUES
('cns1id234567890123456789', 'Temi Okafor', 8, 'Child loves outdoor activities', true, 'bkg1id234567890123456789', '2025-04-15 09:35:00', '2025-04-15 09:35:00'),
('cns2id345678901234567890', 'Kemi Okafor', 6, 'First time at such events', true, 'bkg1id234567890123456789', '2025-04-15 09:36:00', '2025-04-15 09:36:00'),
('cns3id456789012345678901', 'Chichi Okonkwo', 10, 'Very active child, loves swimming', true, 'bkg2id345678901234567890', '2025-04-18 11:20:00', '2025-04-18 11:20:00');

-- Insert favorites
INSERT INTO "favorite" ("id", "userId", "eventId", "createdAt", "updatedAt") VALUES
('fav1id234567890123456789', 'usr1id234567890123456789', 'evt2id345678901234567890', '2025-04-12 14:20:00', '2025-04-12 14:20:00'),
('fav2id345678901234567890', 'usr2id345678901234567890', 'evt3id456789012345678901', '2025-04-14 10:30:00', '2025-04-14 10:30:00');

-- Insert likes
INSERT INTO "like" ("id", "userId", "eventId", "createdAt", "updatedAt", "crowdSourceId", "commentId", "reviewId") VALUES
('lke1id234567890123456789', 'usr1id234567890123456789', 'evt1id234567890123456789', '2025-04-10 12:00:00', '2025-04-10 12:00:00', NULL, NULL, NULL),
('lke2id345678901234567890', 'usr2id345678901234567890', NULL, '2025-04-11 15:30:00', '2025-04-11 15:30:00', 'crd1id234567890123456789', NULL, NULL);

-- Insert recommendations
INSERT INTO "recommendation" ("id", "userId", "eventId", "reason", "createdAt", "updatedAt") VALUES
('rec1id234567890123456789', 'usr1id234567890123456789', 'evt1id234567890123456789', 'Perfect for children who love outdoor activities and games', '2025-04-16 13:45:00', '2025-04-16 13:45:00'),
('rec2id345678901234567890', 'usr2id345678901234567890', 'evt3id456789012345678901', 'Great for kids who want to learn swimming in a safe environment', '2025-04-17 09:20:00', '2025-04-17 09:20:00');

-- Insert comments
INSERT INTO "comment" ("id", "content", "userId", "crowdSourceId", "parentId", "createdAt", "updatedAt") VALUES
('cmt1id234567890123456789', 'This place is amazing! My kids had so much fun here.', 'usr1id234567890123456789', 'crd1id234567890123456789', NULL, '2025-04-13 16:30:00', '2025-04-13 16:30:00'),
('cmt2id345678901234567890', 'I agree! The facilities are top-notch and very safe for children.', 'usr2id345678901234567890', 'crd1id234567890123456789', 'cmt1id234567890123456789', '2025-04-13 17:15:00', '2025-04-13 17:15:00');

-- Insert reviews
INSERT INTO "review" ("id", "rating", "comment", "verified", "eventId", "createdAt", "updatedAt", "name") VALUES
('rev1id234567890123456789', 5, 'Excellent event! Well organized and kids loved every minute of it.', true, 'evt1id234567890123456789', '2025-04-16 18:00:00', '2025-04-16 18:00:00', 'Kemi Okafor'),
('rev2id345678901234567890', 4, 'Great birthday party setup. Could use more variety in games.', true, 'evt2id345678901234567890', '2025-04-19 20:30:00', '2025-04-19 20:30:00', 'David Okonkwo'),
('rev3id456789012345678901', 5, 'Professional instructors and safe environment for swimming lessons.', false, 'evt3id456789012345678901', '2025-04-21 14:45:00', '2025-04-21 14:45:00', 'Anonymous Parent');