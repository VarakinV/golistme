import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireListingAccess, WorkspaceAccessError } from '@/lib/auth/workspace';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingAccess(id);

    const flyers = await prisma.orderFlyer.findMany({
      where: { orderId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    return NextResponse.json(flyers);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch flyers' }, { status: 500 });
  }
}