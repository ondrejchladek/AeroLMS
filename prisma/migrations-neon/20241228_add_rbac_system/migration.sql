-- Migration: Add role-based access control to Neon database
-- Date: 2024-12-28
-- Description: Add role field to User table and create TrainingAssignment table

-- Step 1: Add role column to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'WORKER';

-- Step 2: Add missing columns to Test table
ALTER TABLE "Test"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP(3);

-- Step 3: Create TrainingAssignment table
CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add unique constraint for trainer-training pair
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingAssignment_trainerId_trainingId_key"
ON "TrainingAssignment"("trainerId", "trainingId");

-- Step 5: Add foreign keys
ALTER TABLE "TrainingAssignment"
ADD CONSTRAINT "TrainingAssignment_trainerId_fkey"
FOREIGN KEY ("trainerId") REFERENCES "User"("UserID")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainingAssignment"
ADD CONSTRAINT "TrainingAssignment_trainingId_fkey"
FOREIGN KEY ("trainingId") REFERENCES "Training"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Set default roles for existing users (optional - adjust as needed)
-- UPDATE "User" SET "role" = 'WORKER' WHERE "role" IS NULL;

-- Step 7: Add some initial role assignments (optional)
-- Admin user example (adjust email/code as needed):
-- UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin@aerolms.com';

-- Trainer users example:
-- UPDATE "User" SET "role" = 'TRAINER' WHERE "code" IN (123, 456); -- Add trainer codes

-- Verification queries:
-- SELECT COUNT(*) FROM "User" WHERE "role" IS NOT NULL;
-- SELECT * FROM "TrainingAssignment";
-- SELECT "role", COUNT(*) FROM "User" GROUP BY "role";