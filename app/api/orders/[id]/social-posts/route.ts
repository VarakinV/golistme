import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireListingAccess, WorkspaceAccessError } from '@/lib/auth/workspace';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingAccess(id);

    const posts = await prisma.orderSocialPost.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(posts);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch social posts' }, { status: 500 });
  }
}