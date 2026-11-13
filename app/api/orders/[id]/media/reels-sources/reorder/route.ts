import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const items: { id: string; sortOrder: number }[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const ids = items.map((i) => i.id);
    const existing = await prisma.orderReelSourceImage.findMany({
      where: { id: { in: ids }, orderId: id },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((x) => x.id));
    const updates = items.filter((i) => existingIds.has(i.id));

    await prisma.$transaction(
      updates.map((u) =>
        prisma.orderReelSourceImage.update({
          where: { id: u.id },
          data: { sortOrder: u.sortOrder },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}