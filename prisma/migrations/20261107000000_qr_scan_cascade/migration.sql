-- Scans belong to an assignment; remove them when the assignment is deleted.
ALTER TABLE "QRScanEvent" DROP CONSTRAINT "QRScanEvent_assignmentId_fkey";

ALTER TABLE "QRScanEvent"
  ADD CONSTRAINT "QRScanEvent_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "QRAssignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
