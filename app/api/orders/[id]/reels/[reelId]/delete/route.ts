import { NextRequest, NextResponse } from 'next/server';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { deleteFromS3, isS3Available } from '@/lib/utils/s3';
import { deleteRender, type AwsRegion } from '@remotion/lambda/client';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; reelId: string }> }) {
  try {
    const { id, reelId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');

    const reel = await prisma.orderReel.findUnique({ where: { id: reelId } });
    if (!reel || reel.orderId !== id) return NextResponse.json({ error: 'Reel not found' }, { status: 404 });

    // Purge the render from the Remotion bucket (progress files + out.mp4)
    if (
      (reel.provider || '').toLowerCase() === 'remotion' &&
      reel.renderId &&
      reel.renderId !== 'pending'
    ) {
      try {
        await deleteRender({
          renderId: reel.renderId,
          bucketName: process.env.REMOTION_BUCKET_NAME || '',
          region: (process.env.REMOTION_AWS_REGION || 'ca-central-1') as AwsRegion,
        });
      } catch (e) {
        console.warn('Remotion deleteRender failed (ignored):', e);
      }
    }

    // Delete S3 files if present
    try {
      if (isS3Available()) {
        const urls = [reel.url, reel.thumbnail].filter(Boolean) as string[];
        for (const ustr of urls) {
          try {
            const u = new URL(ustr);
            const host = u.hostname || '';
            const isS3Host = host.includes('s3.amazonaws.com') || host.includes('.s3.');
            if (isS3Host) {
              await deleteFromS3(ustr);
            }
          } catch (e) {
            // ignore URL parse or delete errors
          }
        }
      }
    } catch (e) {
      console.warn('S3 delete failed (ignored):', e);
    }

    // Delete DB record
    await prisma.orderReel.delete({ where: { id: reelId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

