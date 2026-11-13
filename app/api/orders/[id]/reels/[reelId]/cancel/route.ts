import { NextRequest, NextResponse } from 'next/server';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; reelId: string }> }) {
  try {
    const { id, reelId } = await params;
    await requireListingPermission(id, 'GENERATE_MARKETING');

    const reel = await prisma.orderReel.findUnique({ where: { id: reelId } });
    if (!reel || reel.orderId !== id) return NextResponse.json({ error: 'Reel not found' }, { status: 404 });

    if (reel.status === 'COMPLETE') return NextResponse.json({ error: 'Cannot cancel a completed reel' }, { status: 400 });

    await prisma.orderReel.update({ where: { id: reelId }, data: { status: 'FAILED', error: 'Cancelled by user' } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Cancel failed' }, { status: 500 });
  }
}

