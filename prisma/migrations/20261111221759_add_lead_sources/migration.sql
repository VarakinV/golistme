-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'BOOK_SHOWING';
ALTER TYPE "LeadSource" ADD VALUE 'MORTGAGE_CALCULATOR';
ALTER TYPE "LeadSource" ADD VALUE 'HOME_WORTH';
ALTER TYPE "LeadSource" ADD VALUE 'SIMILAR_HOMES';
