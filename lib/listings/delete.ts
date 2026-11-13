import { prisma } from "@/lib/db/prisma";
import { deleteS3Prefix } from "@/lib/utils/s3";

/**
 * Permanently removes a listing, its child records, its QR assignments/scans,
 * and every S3 object under orders/<id>/.
 *
 * QR codes and their printables are intentionally kept so physical printed
 * codes can be reassigned to another listing.
 */
export async function deleteListingCompletely(listingId: string): Promise<void> {
  const qrAssignments = await prisma.qRAssignment.findMany({
    where: { orderId: listingId },
    select: { id: true, qrCodeId: true, unassignedAt: true },
  });
  const qrAssignmentIds = qrAssignments.map((assignment) => assignment.id);
  const affectedQrCodeIds = [
    ...new Set(
      qrAssignments
        .filter((assignment) => assignment.unassignedAt === null)
        .map((assignment) => assignment.qrCodeId)
    ),
  ];

  await prisma.$transaction([
    prisma.photo.deleteMany({ where: { orderId: listingId } }),
    prisma.video.deleteMany({ where: { orderId: listingId } }),
    prisma.floorPlan.deleteMany({ where: { orderId: listingId } }),
    prisma.attachment.deleteMany({ where: { orderId: listingId } }),
    prisma.embed.deleteMany({ where: { orderId: listingId } }),
    prisma.orderReelSourceImage.deleteMany({ where: { orderId: listingId } }),
    prisma.orderReel.deleteMany({ where: { orderId: listingId } }),
    prisma.orderFlyer.deleteMany({ where: { orderId: listingId } }),
    prisma.orderSocialPost.deleteMany({ where: { orderId: listingId } }),
    prisma.propertyInquiry.deleteMany({ where: { orderId: listingId } }),
    prisma.qRScanEvent.deleteMany({
      where: { assignmentId: { in: qrAssignmentIds } },
    }),
    prisma.qRAssignment.deleteMany({ where: { orderId: listingId } }),
    prisma.propertyPage.deleteMany({ where: { orderId: listingId } }),
    prisma.listing.delete({ where: { id: listingId } }),
  ]);

  // Keep the QR code and its printables for reuse, but mark it unassigned when
  // this listing was its last active assignment.
  for (const qrCodeId of affectedQrCodeIds) {
    const remaining = await prisma.qRAssignment.count({
      where: { qrCodeId, unassignedAt: null },
    });
    if (remaining === 0) {
      try {
        await prisma.qRCode.update({
          where: { id: qrCodeId },
          data: { status: "UNASSIGNED" },
        });
      } catch {}
    }
  }

  await deleteS3Prefix(`orders/${listingId}/`);
}