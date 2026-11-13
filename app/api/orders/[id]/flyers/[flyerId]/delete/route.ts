import { NextRequest, NextResponse } from 'next/server';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { deleteFromS3, isS3Available } from '@/lib/utils/s3';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; flyerId: string }> }) {
  try {
    const { id, flyerId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');

    const flyer = await prisma.orderFlyer.findUnique({ where: { id: flyerId } });
    if (!flyer || flyer.orderId !== id) return NextResponse.json({ error: 'Flyer not found' }, { status: 404 });

    // Delete S3 files if present
    if (isS3Available()) {
      for (const u of [flyer.url, flyer.previewUrl]) {
        if (!u) continue;
        try {
          const host = new URL(u).hostname || '';
          const isS3Host = host.includes('s3.amazonaws.com') || host.includes('.s3.');
          if (isS3Host) await deleteFromS3(u);
        } catch {}
      }
    }

    await prisma.orderFlyer.delete({ where: { id: flyerId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

