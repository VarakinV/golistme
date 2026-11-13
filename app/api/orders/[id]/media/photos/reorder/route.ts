import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireListingPermission, WorkspaceAccessError } from '@/lib/auth/workspace';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    const found = await prisma.photo.findMany({
      where: { id: { in: ids }, orderId: id },
      select: { id: true },
    });
    const foundIds = new Set(found.map((f) => f.id));
    const filtered = ids.filter((pid) => foundIds.has(pid));
    if (!filtered.length) return NextResponse.json({ error: 'No matching photos' }, { status: 404 });

    await prisma.$transaction(
      filtered.map((pid, index) =>
        prisma.photo.update({ where: { id: pid }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to reorder photos' }, { status: 500 });
  }
}
