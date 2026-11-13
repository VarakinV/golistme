import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission, isPlatformAdmin } from '@/lib/auth/workspace';
import { deleteFromS3 } from '@/lib/utils/s3';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(ctx, 'MANAGE_LISTINGS')) {
      return NextResponse.json({ error: 'Missing permission' }, { status: 403 });
    }

    const { id } = await params;
    const isAdmin = isPlatformAdmin(ctx);
    const realtorId = ctx.workspaceId;
    const currentUserId = ctx.userId;

    const qrCode = await prisma.qRCode.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            order: true,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    if (!isAdmin) {
      if (qrCode.createdByUserId !== currentUserId) {
        const currentAssignment = qrCode.assignments[0];
        if (!currentAssignment || currentAssignment.order.realtorId !== realtorId) {
          return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
        }
      }
    }

    const printables = await prisma.qRPrintable.findMany({
      where: { qrCodeId: id },
      select: { svgUrl: true, pngUrl: true, pdfUrl: true },
    });

    for (const printable of printables) {
      if (printable.svgUrl) {
        await deleteFromS3(printable.svgUrl);
      }
      if (printable.pngUrl) {
        await deleteFromS3(printable.pngUrl);
      }
      if (printable.pdfUrl) {
        await deleteFromS3(printable.pdfUrl);
      }
    }

    await prisma.$transaction(async (tx) => {
      const assignments = await tx.qRAssignment.findMany({
        where: { qrCodeId: id },
        select: { id: true },
      });
      const assignmentIds = assignments.map((a) => a.id);

      await tx.qRScanEvent.deleteMany({
        where: { assignmentId: { in: assignmentIds } },
      });

      await tx.propertyInquiry.deleteMany({
        where: { qrAssignmentId: { in: assignmentIds } },
      });

      await tx.qRPrintable.deleteMany({
        where: { qrCodeId: id },
      });

      await tx.qRAssignment.deleteMany({
        where: { qrCodeId: id },
      });

      await tx.qRCode.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[QR DELETE]', e);
    return NextResponse.json({ error: 'Failed to delete QR code' }, { status: 500 });
  }
}
