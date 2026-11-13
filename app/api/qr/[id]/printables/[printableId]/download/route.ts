import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, isPlatformAdmin } from '@/lib/auth/workspace';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; printableId: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, printableId } = await params;
  const qrCode = await prisma.qRCode.findUnique({
    where: { id },
    include: {
      assignments: {
        where: { unassignedAt: null },
        select: { order: { select: { realtorId: true } } },
      },
    },
  });

  if (!qrCode) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }

  if (!isPlatformAdmin(ctx)) {
    const isCreator = qrCode.createdByUserId === ctx.userId;
    const hasWorkspaceAssignment = qrCode.assignments.some(
      (assignment) => assignment.order.realtorId === ctx.workspaceId
    );
    if (!isCreator && !hasWorkspaceAssignment) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }
  }

  const printable = await prisma.qRPrintable.findFirst({
    where: { id: printableId, qrCodeId: qrCode.id },
  });

  if (!printable) {
    return NextResponse.json({ error: 'Printable not found' }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'png';
  const fileUrl = format === 'pdf' ? printable.pdfUrl : printable.pngUrl;

  if (!fileUrl) {
    return NextResponse.json({ error: 'File is not ready' }, { status: 404 });
  }

  const upstream = await fetch(fileUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File could not be downloaded' }, { status: 502 });
  }

  const safeId = qrCode.displayId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeVariant = printable.variantKey.replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename = `${safeId}-${safeVariant}.${format}`;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
