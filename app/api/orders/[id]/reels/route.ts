import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireListingAccess, WorkspaceAccessError } from '@/lib/auth/workspace';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingAccess(id);

    const reels = await prisma.orderReel.findMany({
      where: { orderId: id },
      orderBy: [{ createdAt: 'desc' }],
      include: { musicTrack: { select: { id: true, name: true } } },
    });
    return NextResponse.json(reels);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch reels' }, { status: 500 });
  }
}