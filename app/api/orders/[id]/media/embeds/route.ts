import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  requireListingAccess,
  requireListingPermission,
  listingWhereForContext,
  WorkspaceAccessError,
} from '@/lib/auth/workspace';

function errorResponse(e: unknown, fallback: string) {
  if (e instanceof WorkspaceAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireListingAccess(id);
    const items = await prisma.embed.findMany({
      where: { orderId: id, order: listingWhereForContext(ctx) },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (e) {
    return errorResponse(e, 'Failed to fetch embeds');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const title = String(body?.title || '').trim() || '3D Virtual Tour';
    const embedUrl = String(body?.embedUrl || '').trim();
    if (!embedUrl) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const created = await prisma.embed.create({ data: { orderId: id, title, embedUrl } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return errorResponse(e, 'Failed to save embed');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await requireListingPermission(id, 'MANAGE_LISTINGS');

    const body = await req.json();
    const ids: string[] = body?.ids || [];
    if (!ids.length) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    await prisma.embed.deleteMany({
      where: { id: { in: ids }, orderId: id, order: listingWhereForContext(ctx) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'Failed to delete embeds');
  }
}
