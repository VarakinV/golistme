-- Replace ListingStatus values with the GoList three-state model.
-- PUBLISHED -> ACTIVE, ARCHIVED -> SOLD, DRAFT/SOLD unchanged.

ALTER TYPE "ListingStatus" RENAME TO "ListingStatus_old";

CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD');

ALTER TABLE "Listing" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Listing"
  ALTER COLUMN "status" TYPE "ListingStatus"
  USING (
    CASE "status"::text
      WHEN 'PUBLISHED' THEN 'ACTIVE'
      WHEN 'ARCHIVED' THEN 'SOLD'
      ELSE "status"::text
    END
  )::"ListingStatus";

ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ListingStatus_old";
