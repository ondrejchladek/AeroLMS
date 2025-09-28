# 🚀 Neon Database Migration Guide - Role-Based Access Control

## 📋 Overview

This guide documents the migration process for adding role-based access control (RBAC) and training assignment features to the Neon PostgreSQL production database.

## 🔄 Changes to Apply

### 1. **User Model Updates**
- ✅ Add `role` field with default value `'WORKER'`
- ✅ Add relation to `TrainingAssignment`

### 2. **Training Model Updates**
- ✅ Add relation to `TrainingAssignment`

### 3. **Test Model Updates**
- ✅ Add `isActive` field (Boolean, default true)
- ✅ Add `validFrom` field (DateTime, optional)
- ✅ Add `validTo` field (DateTime, optional)

### 4. **New Model: TrainingAssignment**
- ✅ Complete new model for trainer-training relationships
- ✅ Many-to-many relationship between trainers and trainings

## 📝 Migration Steps

### Step 1: Backup Current Database
**CRITICAL: Always backup before migration!**

```bash
# Using Neon CLI or dashboard
# Export current database state
```

### Step 2: Apply Schema Updates

#### Option A: Using Prisma Migrate (Recommended)

```bash
# 1. Set environment to Neon
export DATABASE_URL=$DATABASE_URL_NEON

# 2. Generate migration from updated schema
npx prisma migrate dev --schema=./prisma/schema.neon.prisma --name add_rbac_system

# 3. Review the generated SQL
# Check: prisma/migrations/[timestamp]_add_rbac_system/migration.sql

# 4. Apply to production
npx prisma migrate deploy --schema=./prisma/schema.neon.prisma
```

#### Option B: Manual SQL Execution

Execute the SQL from `prisma/migrations/neon/001_add_roles.sql`:

```sql
-- Run this SQL in Neon dashboard or CLI

-- 1. Add role to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'WORKER';

-- 2. Add fields to Test table
ALTER TABLE "Test"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP(3);

-- 3. Create TrainingAssignment table
CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- 4. Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingAssignment_trainerId_trainingId_key"
ON "TrainingAssignment"("trainerId", "trainingId");

-- 5. Add foreign keys
ALTER TABLE "TrainingAssignment"
ADD CONSTRAINT "TrainingAssignment_trainerId_fkey"
FOREIGN KEY ("trainerId") REFERENCES "User"("UserID")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainingAssignment"
ADD CONSTRAINT "TrainingAssignment_trainingId_fkey"
FOREIGN KEY ("trainingId") REFERENCES "Training"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Step 3: Assign Initial Roles

```sql
-- Set admin role (adjust email/code as needed)
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "email" = 'admin@example.com'
   OR "code" = 1; -- Your admin code

-- Set trainer roles (adjust codes as needed)
UPDATE "User"
SET "role" = 'TRAINER'
WHERE "code" IN (123, 456); -- Your trainer codes

-- All other users remain as WORKER (default)
```

### Step 4: Generate Prisma Client

```bash
# Regenerate Prisma client for Neon schema
npx prisma generate --schema=./prisma/schema.neon.prisma
```

### Step 5: Verify Migration

```sql
-- Check role distribution
SELECT "role", COUNT(*)
FROM "User"
GROUP BY "role";

-- Check TrainingAssignment table
SELECT * FROM "TrainingAssignment" LIMIT 5;

-- Check Test table new fields
SELECT "id", "title", "isActive", "validFrom", "validTo"
FROM "Test"
LIMIT 5;
```

## 🔧 Rollback Plan

If something goes wrong:

```sql
-- Remove TrainingAssignment table
DROP TABLE IF EXISTS "TrainingAssignment";

-- Remove new columns from Test
ALTER TABLE "Test"
DROP COLUMN IF EXISTS "isActive",
DROP COLUMN IF EXISTS "validFrom",
DROP COLUMN IF EXISTS "validTo";

-- Remove role from User
ALTER TABLE "User"
DROP COLUMN IF EXISTS "role";
```

## ⚠️ Important Notes

1. **Coordinate with team**: Ensure no active users during migration
2. **Test in staging first**: If you have a staging environment
3. **Monitor after deployment**: Check logs for any issues
4. **Update environment variables**: Ensure `DATABASE_URL_NEON` is correctly set

## 🎯 Post-Migration Tasks

1. **Test authentication**: Verify users can still log in
2. **Test role permissions**:
   - Admin can manage trainers
   - Trainers can edit assigned trainings
   - Workers can view and take tests
3. **Assign trainings to trainers**: Use admin UI to create assignments
4. **Run synchronization**: Sync trainings from User columns to Training table

## 📊 Expected Database State After Migration

- ✅ All users have a `role` field
- ✅ `TrainingAssignment` table exists and is functional
- ✅ Tests have `isActive`, `validFrom`, `validTo` fields
- ✅ Foreign key relationships are established
- ✅ Unique constraints are in place

## 🆘 Troubleshooting

### Issue: Foreign key constraint fails
**Solution**: Check that `trainerId` and `trainingId` reference existing records

### Issue: Duplicate key error
**Solution**: The unique constraint on `[trainerId, trainingId]` prevents duplicates

### Issue: Migration fails
**Solution**:
1. Check Neon connection string
2. Verify database permissions
3. Review SQL syntax for PostgreSQL compatibility

## 📞 Support

If you encounter issues:
1. Check Neon dashboard logs
2. Review Prisma error messages
3. Verify schema.neon.prisma matches this guide
4. Test SQL commands in Neon SQL editor first

---

**Last Updated**: 2024-12-28
**Version**: 1.0.0
**Author**: AeroLMS Development Team